import { useEffect, useState } from "react";
import {
  ArrowLeft,
  MoreVertical,
  Paperclip,
  Search,
  Smile,
  X,
  Loader,
  FileIcon
} from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import io from "socket.io-client";
import { format, isSameDay } from "date-fns";
import { useMail } from "./chat";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Separator } from "../ui/separator";
import { ScrollArea } from "../ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Input } from "../ui/input";
import { useUser } from "@/app/context/userContext";
import VideoCall from "./VideoCall";

interface Message {
  id: number;
  content: string;
  senderId: string;
  sender:{
    name:string;
  }
  senderName:string
  createdAt: string;
  filePath?: string;
  fileType?: string;
  fileName?: string;
}


export function ChatDisplay({ socket ,messages,doctorId,convoId,clientId, removedata }: any) {
  const [mail, setMail] = useMail();
  const [message, setMessage] = useState<string>("");
  const [open, setOpen] = useState(false);
  const { id, role } = useUser();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [isVideoCallActive, setIsVideoCallActive] = useState<boolean>(false);

  const startVideoCall = () => {
    setIsVideoCallActive(true); // Show the VideoCall component
  };

  const handleEmojiClick = (event: any) => {
    setOpen(false);
    setMessage((prev) => prev + event.emoji);
  };

  let reqid;

  useEffect(() => {

    // Cleanup listener on component unmount
    return () => {
      socket.off("conversationId");
    };
  }, []);

  // Function to send message
  const sendMessage = () => {
   
      const conversationType = mail.type === "COMMUNITY" ? "COMMUNITY" : "PRIVATE";
      const roomId = conversationType === "PRIVATE" ? `room_${doctorId}_${clientId}` : convoId;
reqid =conversationType === "PRIVATE" ?convoId:mail.selected
    console.log('Sending message with convoId:', convoId); // Debugging log

      socket.emit("sendMessage", {
        conversationType,
        conversationId: reqid, // Use the stored convoId
        roomId,
        message,
        senderId: role === "DOCTOR" ? doctorId : clientId,
      });

      setMessage(""); // Clear the message input
 
  };
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const selectedFile = event.target.files[0];
      setFile(selectedFile);

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const uploadFile = async () => {
    if (!file) return;

    setIsLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:8000/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();

      if (data.filePath) {
        socket.emit("fileUpload", {
          conversationId:convoId,
          roomId: `room_${doctorId}_${clientId}`,
          filePath: data.filePath,
          senderId: role === "DOCTOR" ? doctorId : clientId,
          fileType: file.type,
          fileName: file.name,
        });

        setFile(null);
        setPreviewUrl(null);
      socket.off("fileUpload");
      }

    } catch (error) {
      console.error('Error uploading file:', error);
      // Handle the error (e.g., show an error message to the user)
    } finally {
      setIsLoading(false);
    }
  };

  const cancelFileUpload = () => {
    setFile(null);
    setPreviewUrl(null);
  };

  const Remove = () => {
    setMail({ selected: null, name: "" });
    removedata();
  };

  useEffect(() => {
    setOpen(false);
    setMessage("");
  }, [removedata, messages]);

  const renderFilePreview = (filePath: string, fileType: string, fileName: string) => {
    if (fileType.startsWith('image/')) {
      return (
        <div className="relative w-48 h-48 bg-muted rounded-md overflow-hidden">
          <img src={filePath} alt={fileName} className="w-full h-full object-cover" />
          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-1 text-xs truncate">
            {fileName}
          </div>
        </div>
      );
    } else {
      return (
        <div className="flex items-center space-x-2 bg-muted p-2 rounded-md">
          <FileIcon size={24} />
          <a href={filePath} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline truncate max-w-[200px]">
            {fileName || "View File"}
          </a>
        </div>
      );
    }
  };
  console.log("message",messages)
  console.log("here=",mail) 
  return (
    <div className="flex relative h-full flex-col">
      <div className="flex items-center h-16 p-3">
      </div>
      <Separator />
      {/* Chat messages */}
      <ScrollArea className="h-[calc(100%-96px)] relative overflow-auto">
        <div className="flex lg:w-[70%] mx-auto p-4 pb-8 gap-2 flex-col">
          {messages.length > 0 ? (
           
            messages.map((item, index) => {
              const currentDate = new Date(item.createdAt);
              const previousDate =
                index > 0 ? new Date(messages[index - 1].createdAt) : null;
              const showDateSeparator =
                !previousDate || !isSameDay(currentDate, previousDate);
              const isCurrentUser = item.senderId === (role === "DOCTOR" ? doctorId : clientId);

              return (
                <div key={item.id}>
                  {showDateSeparator && (
                    <div className="w-full h-10 flex flex-col justify-center items-center my-2">
                      <Separator />
                      <span className="text-sm text-muted-foreground">
                        {format(currentDate, "MMMM d, yyyy")}
                      </span>
                    </div>
                  )}
                  <div className={`flex  ${isCurrentUser ? "justify-end" : "justify-start"}`}>
                   
                    <div
                      className={`lg:max-w-[40%] max-w-[80%] px-2 py-1 font-normal rounded-t-md ${
                        isCurrentUser
                          ? "rounded-l-md bg-primary text-white"
                          : "rounded-r-md bg-muted text-foreground"
                      }`}
                    >
                      {
                                        <div className="text-sm font-semibold flex justify-end items-end xt-white-600 mb-1">
          {item.sender?.name}
        </div>
            }
                     {item.filePath ? (
                        renderFilePreview(item.filePath, item.fileType || '', item.fileName || '')
                      ) : (
                        
                        <p>{item.content}</p>
                      )}

                      <div className="w-full flex justify-end">
                        
                        <p className="text-[10px] opacity-85">
                          {format(currentDate, "p")}
                        </p>
                      </div>

                    </div>
    
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              No messages selected
            </div>
          )}
        </div>
      </ScrollArea>
      {/* Input area */}
      {mail.selected && (
        <div className="sticky right-0 lg:h-24 lg:bg-background bottom-0 w-full flex items-start justify-center">
          <div className="flex gap-2 h-14 items-center w-full lg:w-[70%] py-3 px-4 bg-muted lg:rounded-t-md lg:rounded-l-md">
            {previewUrl ? (
              <div className="relative w-14 h-14">
                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover rounded-md" />
                <button
                  onClick={cancelFileUpload}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <>
                <Popover open={open}>
                  <PopoverTrigger asChild>
                    <Smile size={25} onClick={() => setOpen(true)} />
                  </PopoverTrigger>
                  <PopoverContent>
                    <EmojiPicker onEmojiClick={handleEmojiClick} />
                  </PopoverContent>
                </Popover>
                {mail.type === "PRIVATE"||role=="DOCTOR"?

<><Input
                  placeholder="Type a message..."
                  className="bg-background"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") sendMessage();
                  }}
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
/>
<Button
              variant="outline"
              className="text-muted-foreground w-[40%] bg-muted"
              onClick={previewUrl ? uploadFile : sendMessage}
              disabled={isLoading}
            >
              {isLoading ? <Loader className="animate-spin" /> : (previewUrl ? "Upload" : "Send")}
            </Button>
</>:<></>} 
                <label htmlFor="file-upload">
                  <Paperclip size={25} className="cursor-pointer" />
                </label>
              </>
            )}

          </div>
        </div>
      )}

    {isVideoCallActive ? (
        <VideoCall socket={socket} doctorId={doctorId} clientId={clientId} setIsVideoCallActive={setIsVideoCallActive} />
      ) : (
        <div className="chat-controls">
          <button onClick={startVideoCall} style={{ padding: '10px', backgroundColor: 'blue', color: 'white' }}>
            Start Video Call
          </button>
        </div>
      )}  
    </div>
  );
}