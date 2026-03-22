"""
Smart LLM Router with Clustering and Error Handling
==================================================
Implements intelligent routing between OpenRouter and Groq clusters
with comprehensive error handling, retry logic, and logging.
"""

import os
import json
import logging
import time
import asyncio
from typing import Optional, List, Dict, Any, Union
from dataclasses import dataclass
from enum import Enum
import random
from openai import OpenAI

logger = logging.getLogger(__name__)

class ModelCluster(Enum):
    OPENROUTER = "openrouter"
    GROQ = "groq"

@dataclass
class ModelConfig:
    name: str
    cluster: ModelCluster
    priority: int
    max_retries: int = 2
    timeout: int = 45

@dataclass
class LLMResponse:
    content: str
    model_used: str
    cluster: ModelCluster
    response_time: float
    retries: int

@dataclass
class LLMRequestStats:
    model: str
    cluster: ModelCluster
    response_time: float
    success: bool
    error: Optional[str] = None
    retries: int = 0

class SmartLLMRouter:
    """
    Smart LLM Router with clustering, error handling, and intelligent fallbacks.
    
    Features:
    - Dual cluster support (OpenRouter + Groq)
    - Smart retry logic with exponential backoff
    - Rate limit handling
    - Parallel execution for critical requests
    - Comprehensive logging and metrics
    - Model health monitoring
    """
    
    def __init__(self):
        self._setup_clients()
        self._setup_models()
        self._init_metrics()
        
    def _setup_clients(self):
        """Initialize API clients for both clusters."""
        self.openrouter_key = os.getenv("OPENROUTER_API_KEY", "")
        self.groq_key = os.getenv("GROQ_API_KEY", "")
        
        referer = os.getenv("OPENROUTER_HTTP_REFERER", "https://shieldssentinel.local")
        app_title = os.getenv("OPENROUTER_APP_TITLE", "ShieldSentinel")

        # OpenRouter client
        if self.openrouter_key:
            self.openrouter_client = OpenAI(
                base_url="https://openrouter.ai/api/v1",
                api_key=self.openrouter_key,
                default_headers={
                    "HTTP-Referer": referer,
                    "X-Title": app_title,
                    "X-OpenRouter-Title": app_title,
                },
            )
        else:
            self.openrouter_client = None
            
        # Groq client
        if self.groq_key:
            self.groq_client = OpenAI(
                base_url="https://api.groq.com/openai/v1",
                api_key=self.groq_key,
            )
        else:
            self.groq_client = None
    
    def _models_from_names(self, names: List[str], cluster: ModelCluster) -> List[ModelConfig]:
        return [
            ModelConfig(name=n, cluster=cluster, priority=i + 1)
            for i, n in enumerate(names)
        ]

    def _setup_models(self):
        """Configure model clusters; override with OPENROUTER_MODELS / GROQ_MODELS (comma-separated)."""
        default_or = [
            "arcee-ai/trinity-large-preview:free",
            "nousresearch/hermes-3-llama-3.1-405b:free",
            "qwen/qwen3-coder:free",
            "meta-llama/llama-3.3-70b-instruct:free",
            "openai/gpt-oss-120b:free",
            "google/gemini-2.0-flash-001",
            "deepseek/deepseek-r1-distill-llama-70b",
        ]
        default_groq = [
            "llama-3.3-70b-versatile",
            "qwen-2.5-coder-32b",
            "gemma2-9b-it",
            "qwen/qwen3-32b",
            "moonshotai/kimi-k2-instruct-0905",
        ]

        or_raw = os.getenv("OPENROUTER_MODELS", "").strip()
        groq_raw = os.getenv("GROQ_MODELS", "").strip()

        or_names = [x.strip() for x in or_raw.split(",") if x.strip()] if or_raw else default_or
        groq_names = [x.strip() for x in groq_raw.split(",") if x.strip()] if groq_raw else default_groq

        self.models = {
            ModelCluster.OPENROUTER: self._models_from_names(or_names, ModelCluster.OPENROUTER),
            ModelCluster.GROQ: self._models_from_names(groq_names, ModelCluster.GROQ),
        }

        fb = os.getenv("OPENROUTER_FALLBACK_MODEL", "").strip() or or_names[0]
        self.ultimate_fallback = ModelConfig(fb, ModelCluster.OPENROUTER, 99)
    
    def _init_metrics(self):
        """Initialize metrics tracking."""
        self.request_stats: List[LLMRequestStats] = []
        self.cluster_health = {cluster: True for cluster in ModelCluster}
        self.model_errors = {}
        
    def _log_request(self, stats: LLMRequestStats):
        """Log request statistics."""
        self.request_stats.append(stats)
        
        # Keep only last 100 requests in memory
        if len(self.request_stats) > 100:
            self.request_stats = self.request_stats[-100:]
        
        # Log to file
        log_msg = (
            f"LLM Request | Model: {stats.model} | Cluster: {stats.cluster.value} | "
            f"Success: {stats.success} | Time: {stats.response_time:.2f}s | "
            f"Retries: {stats.retries}"
        )
        if stats.error:
            log_msg += f" | Error: {stats.error}"
            
        if stats.success:
            logger.info(log_msg)
        else:
            logger.warning(log_msg)
    
    def _get_client_for_cluster(self, cluster: ModelCluster):
        """Get the appropriate client for a cluster."""
        if cluster == ModelCluster.OPENROUTER:
            return self.openrouter_client
        elif cluster == ModelCluster.GROQ:
            return self.groq_client
        return None
    
    def _handle_rate_limit(self, model: ModelConfig, retry_count: int):
        """Handle rate limiting with exponential backoff."""
        if retry_count > 0:
            # Exponential backoff: 1s, 2s, 4s, 8s...
            delay = min(2 ** retry_count, 10)  # Cap at 10 seconds
            jitter = random.uniform(0.1, 0.5)  # Add jitter to avoid thundering herd
            time.sleep(delay + jitter)
            logger.info(f"Rate limited on {model.name}, retrying after {delay:.1f}s (attempt {retry_count})")
    
    def _try_model(self, model: ModelConfig, messages: List[Dict], **kwargs) -> Optional[str]:
        """Try a specific model with error handling."""
        client = self._get_client_for_cluster(model.cluster)
        if not client:
            logger.error(f"No client available for cluster {model.cluster.value}")
            return None
            
        start_time = time.time()
        last_error = None
        
        for attempt in range(model.max_retries + 1):
            try:
                response = client.chat.completions.create(
                    model=model.name,
                    messages=messages,
                    timeout=model.timeout,
                    **kwargs
                )
                
                content = response.choices[0].message.content
                if not content or content.strip() == "":
                    raise ValueError("Empty response from model")
                
                response_time = time.time() - start_time
                
                # Log successful request
                stats = LLMRequestStats(
                    model=model.name,
                    cluster=model.cluster,
                    response_time=response_time,
                    success=True,
                    retries=attempt
                )
                self._log_request(stats)
                
                # Mark cluster as healthy
                self.cluster_health[model.cluster] = True
                
                logger.info(f"✅ {model.cluster.value.upper()} → {model.name} ({response_time:.2f}s)")
                return content
                
            except Exception as e:
                last_error = e
                error_str = str(e).lower()
                
                # Handle specific error types
                if "429" in error_str or "rate limit" in error_str:
                    self._handle_rate_limit(model, attempt)
                    continue
                elif "timeout" in error_str:
                    logger.warning(f"Timeout on {model.name} (attempt {attempt + 1})")
                    continue
                elif "invalid" in error_str or "parse" in error_str:
                    logger.warning(f"Invalid response from {model.name}: {e}")
                    break  # Don't retry invalid responses
                else:
                    logger.warning(f"Error on {model.name} (attempt {attempt + 1}): {e}")
                    continue
        
        # Log failed request
        response_time = time.time() - start_time
        stats = LLMRequestStats(
            model=model.name,
            cluster=model.cluster,
            response_time=response_time,
            success=False,
            error=str(last_error),
            retries=attempt
        )
        self._log_request(stats)
        
        # Mark cluster as unhealthy if too many failures
        if model.cluster in self.cluster_health:
            recent_failures = sum(1 for s in self.request_stats[-20:] 
                                if s.cluster == model.cluster and not s.success)
            if recent_failures > 5:
                self.cluster_health[model.cluster] = False
                logger.warning(f"Cluster {model.cluster.value} marked as unhealthy")
        
        return None
    
    def _try_cluster(self, cluster: ModelCluster, messages: List[Dict], **kwargs) -> Optional[str]:
        """Try all models in a cluster in priority order."""
        if not self.cluster_health.get(cluster, True):
            logger.warning(f"Skipping unhealthy cluster {cluster.value}")
            return None
            
        models = sorted(self.models[cluster], key=lambda m: m.priority)
        
        for model in models:
            logger.info(f"🔄 Trying {cluster.value.upper()} → {model.name}")
            result = self._try_model(model, messages, **kwargs)
            if result:
                return result
                
        return None
    

    def chat(self, 
            messages: List[Dict], 
            system_prompt: Optional[str] = None,
            temperature: float = 0.3,
            max_tokens: int = 2048,
            json_mode: bool = False) -> str:
        """
        Send chat request with intelligent routing and fallbacks.
        
        Args:
            messages: List of message dictionaries
            system_prompt: Optional system prompt
            temperature: Sampling temperature
            max_tokens: Maximum tokens to generate
            json_mode: Force JSON response format
            
        Returns:
            Response content string
            
        Raises:
            RuntimeError: If all models fail
        """
        # Prepare full message list
        full_messages = []
        if system_prompt:
            full_messages.append({"role": "system", "content": system_prompt})
        full_messages.extend(messages)
        
        # Prepare kwargs
        kwargs = {
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}
        
        logger.info("🚀 Starting LLM request cascade")


        # Hosted / multi-tenant default: cloud APIs first (one server key serves all users)
        result = self._try_cluster(ModelCluster.OPENROUTER, full_messages, **kwargs)
        if result:
            return result

        logger.info("🔄 OpenRouter failed, trying Groq cluster")
        result = self._try_cluster(ModelCluster.GROQ, full_messages, **kwargs)
        if result:
            return result

        # Local LLM support removed.

        logger.info("🔄 All clusters failed, trying ultimate OpenRouter fallback")
        result = self._try_model(self.ultimate_fallback, full_messages, **kwargs)
        if result:
            return result
        
        raise RuntimeError("All LLM providers failed. Check API keys and model availability.")
    
    def chat_json(self, 
                 messages: List[Dict], 
                 system_prompt: Optional[str] = None,
                 temperature: float = 0.3,
                 max_tokens: int = 2048) -> Dict[str, Any]:
        """
        Send chat request and parse JSON response.
        
        Args:
            messages: List of message dictionaries
            system_prompt: Optional system prompt
            temperature: Sampling temperature
            max_tokens: Maximum tokens to generate
            
        Returns:
            Parsed JSON response as dictionary
        """
        try:
            raw_response = self.chat(
                messages=messages,
                system_prompt=system_prompt,
                temperature=temperature,
                max_tokens=max_tokens,
                json_mode=True
            )
            
            # Parse JSON response
            try:
                return json.loads(raw_response)
            except json.JSONDecodeError:
                # Try to extract JSON from markdown code blocks
                cleaned = raw_response.strip()
                if cleaned.startswith("```json"):
                    cleaned = cleaned[7:]
                if cleaned.startswith("```"):
                    cleaned = cleaned[3:]
                if cleaned.endswith("```"):
                    cleaned = cleaned[:-3]
                cleaned = cleaned.strip()
                
                try:
                    return json.loads(cleaned)
                except json.JSONDecodeError:
                    # Try regex extraction as last resort
                    import re
                    match = re.search(r'\{.*\}', cleaned, re.DOTALL)
                    if match:
                        return json.loads(match.group())
                    
                    return {
                        "error": "Failed to parse JSON response",
                        "raw_response": raw_response[:500]
                    }
                    
        except Exception as e:
            logger.error(f"JSON chat failed: {e}")
            return {
                "error": f"LLM request failed: {str(e)}",
                "raw_response": None
            }
    
    async def chat_parallel(self, 
                           messages: List[Dict], 
                           num_models: int = 3,
                           system_prompt: Optional[str] = None,
                           temperature: float = 0.3,
                           max_tokens: int = 2048) -> List[str]:
        """
        Send parallel requests to multiple models for critical scans.
        
        Args:
            messages: List of message dictionaries
            num_models: Number of models to use in parallel
            system_prompt: Optional system prompt
            temperature: Sampling temperature
            max_tokens: Maximum tokens to generate
            
        Returns:
            List of successful responses
        """
        # Prepare full message list
        full_messages = []
        if system_prompt:
            full_messages.append({"role": "system", "content": system_prompt})
        full_messages.extend(messages)
        
        # Select models from different clusters for diversity
        selected_models = []
        
        # Get top models from each cluster
        for cluster in ModelCluster:
            if self.cluster_health.get(cluster, True):
                models = sorted(self.models[cluster], key=lambda m: m.priority)[:2]
                selected_models.extend(models)
        
        # Limit to requested number
        selected_models = selected_models[:num_models]
        
        if not selected_models:
            raise RuntimeError("No healthy models available for parallel execution")
        
        logger.info(f"🚀 Starting parallel requests to {len(selected_models)} models")
        
        # Create async tasks
        tasks = []
        for model in selected_models:
            task = asyncio.create_task(
                asyncio.to_thread(self._try_model, model, full_messages, 
                                temperature=temperature, max_tokens=max_tokens)
            )
            tasks.append(task)
        
        # Wait for all tasks with timeout
        try:
            results = await asyncio.gather(*tasks, return_exceptions=True)
        except Exception as e:
            logger.error(f"Parallel execution failed: {e}")
            results = []
        
        # Filter successful responses
        successful_responses = []
        for i, result in enumerate(results):
            if isinstance(result, str) and result.strip():
                successful_responses.append(result)
                logger.info(f"✅ Parallel model {i+1} succeeded")
            elif isinstance(result, Exception):
                logger.warning(f"❌ Parallel model {i+1} failed: {result}")
        
        if not successful_responses:
            raise RuntimeError("All parallel models failed")
        
        logger.info(f"🎯 Parallel execution: {len(successful_responses)}/{len(selected_models)} models succeeded")
        return successful_responses
    
    def get_health_status(self) -> Dict[str, Any]:
        """Get health status of all clusters and models."""
        return {
            "clusters": {
                cluster.value: {
                    "healthy": self.cluster_health.get(cluster, False),
                    "models": [m.name for m in self.models.get(cluster, [])]
                }
                for cluster in ModelCluster
            },
            "recent_requests": len(self.request_stats),
            "success_rate": sum(1 for s in self.request_stats[-20:] if s.success) / max(len(self.request_stats[-20:]), 1),
            "avg_response_time": sum(s.response_time for s in self.request_stats[-20:]) / max(len(self.request_stats[-20:]), 1)
        }

# Global instance for easy import
smart_router = SmartLLMRouter()
