import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Paperclip, Send, X, Bot } from 'lucide-react';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
  timestamp: Date;
}

export default function GeminiChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('请上传图片文件');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        alert('图片大小不能超过 10MB');
        return;
      }
      setUploadedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removeFile = () => {
    setUploadedFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const convertImageToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        resolve(base64String.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const sendMessage = async (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!input.trim() && !uploadedFile) return;

    const userMessage: Message = {
      id: Date.now(),
      role: 'user',
      content: input || '请分析这张图片',
      imageUrl: imagePreview || undefined,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      let imageData = null;
      let mimeType = null;
      if (uploadedFile) {
        imageData = await convertImageToBase64(uploadedFile);
        mimeType = uploadedFile.type;
      }

      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input || '请分析这张图片',
          imageData,
          mimeType,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '请求失败');
      }

      const data = await response.json();
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: 'assistant', content: data.text, timestamp: new Date() },
      ]);
      removeFile();
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          content: `错误: ${error.message || '发送消息失败，请重试'}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      sendMessage(e);
    }
  };

  return (
    <Card className="flex h-[calc(100vh-10rem)] flex-col">
      <CardHeader className="border-b pb-4">
        <CardTitle>Gemini 多模态助手</CardTitle>
        <CardDescription>支持文本对话和图片分析</CardDescription>
      </CardHeader>

      <ScrollArea className="flex-1 px-4">
        <div className="space-y-4 py-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <Bot className="mb-3 h-10 w-10 opacity-40" />
              <p className="text-sm">开始与 Gemini 对话，或上传图片进行分析</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'max-w-[85%] rounded-lg border p-4 text-sm',
                  message.role === 'user'
                    ? 'ml-auto bg-primary text-primary-foreground'
                    : 'mr-auto bg-muted'
                )}
              >
                <div className="mb-2 flex items-center justify-between gap-4 text-xs opacity-70">
                  <span>{message.role === 'user' ? '你' : 'Gemini'}</span>
                  <span>
                    {message.timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {message.imageUrl && (
                  <img src={message.imageUrl} alt="上传的图片" className="mb-2 max-h-48 rounded-md" />
                )}
                <div className="whitespace-pre-wrap">
                  {message.content.split('\n').map((line, idx) => (
                    <p key={idx}>{line || '\u00A0'}</p>
                  ))}
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="mr-auto max-w-[85%] rounded-lg border bg-muted p-4">
              <div className="flex gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:-0.3s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:-0.15s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <CardContent className="space-y-3 border-t pt-4">
        {imagePreview && (
          <div className="relative inline-block">
            <img src={imagePreview} alt="预览" className="h-20 rounded-md border object-cover" />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute -right-2 -top-2 h-6 w-6"
              onClick={removeFile}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            id="gemini-file-input"
          />
          <Button type="button" variant="outline" size="icon" asChild>
            <label htmlFor="gemini-file-input" className="cursor-pointer">
              <Paperclip className="h-4 w-4" />
            </label>
          </Button>
          <Textarea
            className="min-h-[40px] flex-1 resize-none"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="输入消息或上传图片进行分析..."
            rows={1}
          />
          <Button
            type="button"
            size="icon"
            onClick={sendMessage}
            disabled={loading || (!input.trim() && !uploadedFile)}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
