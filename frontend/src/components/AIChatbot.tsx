import { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, User, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/lib/UserContext';
import { useNav } from '@/lib/nav';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

const MOCK_RESPONSES = [
  "That's a great question! Let me check the curriculum for you.",
  "I'd recommend reviewing the 'Primitive Data Types' module first.",
  "Your code looks almost perfect! Just check the indentation on line 12.",
  "I can help you schedule a 1-on-1 session with a mentor if you're stuck.",
  "Great job on completing your recent assignment! Keep up the momentum.",
  "The placement drive for Amazon is starting next week. Ensure your resume is updated!",
];

export function AIChatbot() {
  const { user: currentUser } = useUser();
  const { route } = useNav();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'ai',
      text: `Hi ${currentUser.name.split(' ')[0]}! I'm your AspireNext AI assistant. How can I help you level up today?`,
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, isOpen]);

  // Hide chatbot completely in coding workspace environment to avoid obstruction
  if (route === 'workspace') return null;

  const handleSend = () => {
    if (!input.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Mock AI reply delay
    setTimeout(() => {
      const randomReply = MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)];
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: randomReply,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-24 lg:bottom-8 right-4 lg:right-8 z-50 p-4 rounded-full shadow-xl shadow-primary-500/30 transition-all duration-300 hover:scale-110 active:scale-95 group",
          isOpen ? "opacity-0 scale-0 pointer-events-none" : "opacity-100 scale-100",
          "bg-primary-500"
        )}
      >
        <Bot className="w-7 h-7 text-white" />
      </button>

      {/* Chat Window */}
      <div
        className={cn(
          "fixed bottom-24 lg:bottom-8 right-4 lg:right-8 z-50 w-[360px] h-[580px] max-h-[85vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 origin-bottom-right border border-slate-200",
          isOpen ? "scale-100 opacity-100" : "scale-50 opacity-0 pointer-events-none"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-primary-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center border border-primary-700 bg-primary-800">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-[16px] tracking-wide">Aspire AI</h3>
              <p className="text-[12px] text-primary-200 font-medium flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-success-400"></span>
                Online & Ready
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-full hover:bg-white/10 text-white/80 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 bg-slate-50/50">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex gap-3 max-w-[85%]",
                msg.sender === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
              )}
            >
              <div
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-sm",
                  msg.sender === 'user' 
                    ? "bg-slate-200 text-slate-600" 
                    : "bg-primary-500 text-white"
                )}
              >
                {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-5 h-5" />}
              </div>
              
              <div
                className={cn(
                  "px-4 py-3 rounded-2xl text-[15px] shadow-sm",
                  msg.sender === 'user'
                    ? "bg-primary-500 text-white rounded-tr-sm"
                    : "bg-white border border-slate-200/80 text-slate-800 rounded-tl-sm"
                )}
              >
                <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                <span className={cn(
                  "block text-[11px] mt-1.5 font-medium",
                  msg.sender === 'user' ? "text-primary-100" : "text-slate-400"
                )}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-3 max-w-[85%] mr-auto">
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-sm bg-primary-500 text-white">
                <Bot className="w-5 h-5" />
              </div>
              <div className="px-5 py-4 rounded-2xl bg-white border border-slate-200/80 rounded-tl-sm flex items-center gap-1.5 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0.15s' }}></span>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0.3s' }}></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-slate-100 shrink-0">
          <div className="relative flex items-center bg-[#f1f5f9] rounded-full p-1.5 border border-transparent focus-within:border-primary-500/30 focus-within:ring-4 focus-within:ring-primary-500/10 transition-all">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message Aspire AI..."
              className="w-full bg-transparent border-none pl-4 pr-12 py-2.5 text-[15px] focus:outline-none text-slate-800 placeholder-slate-400"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="absolute right-1.5 w-9 h-9 flex items-center justify-center rounded-full bg-primary-400 text-white hover:bg-primary-500 disabled:opacity-80 disabled:hover:bg-primary-400 transition-colors"
            >
              {isTyping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 -ml-0.5" />}
            </button>
          </div>
          <div className="text-center mt-3">
             <span className="text-[12px] text-slate-400/80 font-medium tracking-tight">AI can make mistakes. Review generated answers.</span>
          </div>
        </div>
      </div>
    </>
  );
}
