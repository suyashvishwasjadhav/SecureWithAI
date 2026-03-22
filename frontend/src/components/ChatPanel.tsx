import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { MessageSquare, X, Minus, Send, Bot, Loader2 } from 'lucide-react';
import api from '../lib/api';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const ChatPanel = ({ scanId }: { scanId: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMsg, setInputMsg] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen, isStreaming]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Fetch suggested prompts only when opened and empty history
      const fetchSuggestions = async () => {
        try {
          const res = await api.get(`/api/scans/${scanId}/chat/suggested`);
          setSuggestedPrompts(res.data.prompts || []);
        } catch (e) {
          console.error("Failed to load suggested prompts", e);
        }
      };
      
      // Load history
      // Though history is stored server-side, we ideally fetch it when opened. For now we will rely on UI state or fetch if endpoint existed. Wait, GET /api/scans/{id}/chat doesn't exist to fetch history in the instructions, but we can assume we start fresh or rely on server preserving it natively when we chat.
      
      fetchSuggestions();
    }
  }, [isOpen, scanId, messages.length]);

  const handleSend = async (text: string) => {
    if (!text.trim() || isStreaming) return;

    const newMsg: ChatMessage = { role: 'user', content: text };
    setMessages(prev => [...prev, newMsg, { role: 'assistant', content: '' }]);
    setInputMsg('');
    setIsStreaming(true);

    try {
      const source = new EventSource(`${(import.meta as any).env.VITE_API_URL || 'http://localhost:8000'}/api/scans/${scanId}/chat/stream?message=${encodeURIComponent(text)}`);
      
      source.onmessage = (e) => {
        const data = JSON.parse(e.data);
        
        if (data.token) {
          setMessages(prev => {
            const newArray = [...prev];
            const lastMsg = newArray[newArray.length - 1];
            if (lastMsg.role === 'assistant') {
              lastMsg.content += data.token;
            }
            return newArray;
          });
        }
        
        if (data.done) {
          source.close();
          setIsStreaming(false);
        }
        
        if (data.error) {
          source.close();
          setIsStreaming(false);
          setMessages(prev => {
             const newArray = [...prev];
             newArray[newArray.length - 1].content = `*Error: ${data.error}*`;
             return newArray;
          });
        }
      };

      source.onerror = () => {
        source.close();
        setIsStreaming(false);
      };

    } catch (e) {
      setIsStreaming(false);
    }
  };

  const clearChat = async () => {
    try {
      await api.delete(`/api/scans/${scanId}/chat`);
      setMessages([]);
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(79,70,229,0.5)] hover:scale-105 transition-all z-50 group"
        title="Ask AI about this scan"
      >
        <div className="absolute inset-0 rounded-full border-2 border-indigo-400 animate-ping opacity-20 group-hover:opacity-40"></div>
        <MessageSquare className="w-8 h-8 text-white" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-8 right-8 w-[400px] h-[520px] bg-[#111111] border border-[#1f1f1f] rounded-3xl shadow-2xl flex flex-col z-50 animate-slideUp overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f1f1f] bg-[#0a0a0a]">
        <div className="flex items-center gap-2">
           <Bot className="w-5 h-5 text-indigo-400" />
           <span className="font-black text-sm uppercase tracking-widest text-white">ShieldSentinel AI</span>
        </div>
        <div className="flex items-center gap-2">
           <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-white transition-colors"><Minus className="w-5 h-5" /></button>
           <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide bg-gradient-to-b from-[#111111] to-[#0a0a0a]">
        
        {messages.length === 0 && (
          <div className="space-y-4 pt-10">
            <div className="text-center space-y-2 mb-8">
               <div className="inline-flex p-4 bg-indigo-500/10 rounded-full mb-2">
                 <Bot className="w-8 h-8 text-indigo-400" />
               </div>
               <h3 className="text-white font-bold text-lg">How can I help you?</h3>
               <p className="text-xs text-gray-500">I have analyzed this entire report and the associated codebase configuration.</p>
            </div>
            
            <div className="flex flex-wrap gap-2 justify-center">
              {suggestedPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(prompt)}
                  className="px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-xs text-indigo-300 hover:bg-indigo-500/20 hover:border-indigo-500/30 transition-all text-left"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div 
              className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 rounded-br-sm' 
                  : 'bg-[#1a1a1a] border border-[#2a2a2a] text-gray-300 rounded-bl-sm prose prose-invert prose-p:my-1 prose-pre:bg-[#0a0a0a] prose-pre:border prose-pre:border-[#2a2a2a] prose-pre:text-xs'
              }`}
            >
              {msg.role === 'assistant' && !msg.content && isStreaming && idx === messages.length - 1 ? (
                 <div className="flex items-center gap-2 text-indigo-400">
                    <Loader2 className="w-4 h-4 animate-spin" /> Thinking...
                 </div>
              ) : (
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-[#1f1f1f] bg-[#0a0a0a]">
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(inputMsg); }}
          className="relative flex items-center"
        >
          <input
            type="text"
            value={inputMsg}
            onChange={(e) => setInputMsg(e.target.value)}
            placeholder="Ask anything about this scan..."
            className="w-full bg-[#111111] border border-[#1f1f1f] rounded-xl pl-4 pr-12 py-3 text-sm text-white focus:outline-none focus:border-indigo-600 transition-all"
            disabled={isStreaming}
          />
          <button 
            type="submit"
            disabled={!inputMsg.trim() || isStreaming}
            className="absolute right-2 p-2 text-indigo-500 hover:text-white disabled:text-gray-600 transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
        {messages.length > 0 && (
          <div className="text-center mt-3">
             <button 
               onClick={clearChat}
               className="text-[10px] text-gray-600 hover:text-red-400 uppercase tracking-widest font-bold transition-colors"
             >
                Clear Conversation Memory
             </button>
          </div>
        )}
      </div>
    </div>
  );
};
