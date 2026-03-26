import os
import json
from datetime import datetime
from groq import Groq

# Import the tool registry components
from src.intelligence.tools.zap_tool import ZapTool
from src.intelligence.tools.nikto_tool import NiktoTool
from src.intelligence.tools.exposure_tool import ExposureTool
from src.utils.cleaner import build_clean_report

class AttackBrain:
    def __init__(self):
        """
        Initializes the Groq Attack Brain with the registered tools.
        Expects GROQ_API_KEY in the environment variables.
        """
        
        # The lightweight native tool registry
        self.available_tools = {
            "run_zap_scan": ZapTool(),
            "run_nikto_scan": NiktoTool(),
            "run_exposure_check": ExposureTool(),
        }
        
        # Fallback empty string if not set, let groq sdk raise meaningful errors
        api_key = os.getenv("GROQ_API_KEY") 
        self.client = Groq(api_key=api_key)
        
        self.system_prompt = """
You are 'Sentinel Brain', a merciless, elite ethical hacker and orchestration engine. 
Your objective is to execute a complete penetration test against a target URL.
You have absolute authority to use the tools available to you.

Methodology:
1. ALWAYS start with lightweight recon to orient yourself: Use `run_exposure_check` to find sensitive endpoints rapidly.
2. Based on the recon success, decide whether to deploy heavier, noisier weapons like `run_nikto_scan` and `run_zap_scan`.
3. You can call multiple tools, one after the other. 
4. Once you have exhausted your tools or are satisfied with the damage done, synthesize your thoughts and conclude your attack.

Keep your internal thoughts concise. You are a fast, lethal machine.
"""

    def attack(self, target_url: str):
        print(f"\n[Brain] Waking up. Target locked: {target_url}...")
        print("[Brain] Formulating attack plan...\n")
        
        messages = [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": f"Begin your attack on {target_url}. Use your tools strategically."}
        ]
        
        tools_schema = [tool.get_json_schema() for tool in self.available_tools.values()]
        
        all_raw_findings = []
        
        # The intelligence loop
        while True:
            response = self.client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=messages,
                tools=tools_schema,
                tool_choice="auto",
                temperature=0.2,
                max_completion_tokens=1024
            )
            
            response_message = response.choices[0].message
            messages.append(response_message)
            
            if response_message.content:
                print(f"[Brain Thinking] {response_message.content}")
                
            tool_calls = response_message.tool_calls
            if tool_calls:
                for tool_call in tool_calls:
                    function_name = tool_call.function.name
                    function_args = json.loads(tool_call.function.arguments)
                    
                    if function_name in self.available_tools:
                        tool = self.available_tools[function_name]
                        tool_result = tool.execute(**function_args)
                        
                        # Add valid findings to our master list
                        for finding in tool_result:
                            if "error" not in finding:
                                all_raw_findings.append(finding)
                        
                        # Feed the result back to the LLM so it knows what happened
                        # We truncate string outputs if they are too massive to save context window
                        result_str = json.dumps({"findings_count": len(tool_result), "findings": tool_result})
                        if len(result_str) > 15000:
                            result_str = result_str[:15000] + "... [TRUNCATED]"
                            
                        messages.append({
                            "tool_call_id": tool_call.id,
                            "role": "tool",
                            "name": function_name,
                            "content": result_str,
                        })
                    else:
                        messages.append({
                            "tool_call_id": tool_call.id,
                            "role": "tool",
                            "name": function_name,
                            "content": json.dumps({"error": f"Tool '{function_name}' not found in registry."}),
                        })
            else:
                # The LLM didn't call any tools; it is done attacking.
                print("\n[Brain] Attack sequence concluded.")
                break
                
        # Build the final clean report
        raw_results = {
            "scan_id": f"scan_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "target_url": target_url,
            "scanned_at": datetime.now().isoformat(),
            "tool": "Sentinel Groq Brain Orchestrator",
            "findings": all_raw_findings
        }
        
        final_report = build_clean_report(raw_results)
        return final_report
