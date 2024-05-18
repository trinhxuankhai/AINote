"use client";
import React from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import TipTapMenuBar from "./TipTapMenuBar";
import { Button } from "./ui/button";
import { useDebounce } from "@/lib/useDebounce";
import { useMutation } from "@tanstack/react-query";
import Text from "@tiptap/extension-text";
import axios from "axios";
import { NoteType } from "@/lib/db/schema";
import { useCompletion } from "ai/react";
import { Markdown } from 'tiptap-markdown';

type Props = { note: NoteType };

const TipTapEditor = ({ note }: Props) => {
  const [editorState, setEditorState] = React.useState(
    note.editorState || `<h1>${note.name}</h1>`
  );
  const { complete, completion } = useCompletion({
    api: "/api/completion",
  });

  const saveNote = useMutation({
    mutationFn: async () => {
      const response = await axios.post("/api/saveNote", {
        noteId: note.id,
        editorState,
      });
      return response.data;
    },
  });

  const arrayBufferToBase64String = (arrayBuffer: ArrayBuffer): string => {
    const uint8Array = new Uint8Array(arrayBuffer);
    const binaryArray = Array.from(uint8Array); // Convert Uint8Array to regular array
    const binaryString = binaryArray.map(byte => String.fromCharCode(byte)).join(''); // Convert bytes to string
    return btoa(binaryString); // Encode string to base64
  };

  const customText = Text.extend({
    addKeyboardShortcuts() {
      const shortcuts = {
          "Control-Shift-a": () => {
            const prompt = this.editor.getText();
            complete(prompt);
            console.log("activate AI");
            return true;
          },
          "Control-Shift-c": () => {
            popTextBlock(this.editor);
            return true;
          },
          "Control-Shift-f": () => {
            popFileBlock(this.editor);
            return true;
        }
      };

      return shortcuts;
    },
  });

  const editor = useEditor({
    autofocus: true,
    extensions: [StarterKit, customText, Markdown],
    content: editorState,
    onUpdate: ({ editor }) => {
      setEditorState(editor.getHTML());
    },
  });

  async function popFileBlock(editor) {
    const textEditorContainer = document.querySelector(".prose"); // Assuming ".prose" is the class of the container for the text editor
    
    // Create a wrapper div for text block and close button
    const wrapperDiv = document.createElement("div");
    wrapperDiv.style.display = "flex";
    wrapperDiv.style.flexDirection = "column"; // Set flex direction to column
    wrapperDiv.style.marginBottom = "10px"; // Add some margin at the bottom for spacing

    // Create the upload button
    const uploadButton = document.createElement("input");
    uploadButton.type = "file";
    uploadButton.accept = "application/pdf";
    uploadButton.style.marginRight = "8px"; // Add margin at the bottom to separate from other buttons
    uploadButton.style.padding = "8px 12px"; // Add padding for better appearance
    uploadButton.style.border = "1px solid #ccc"; // Add border
    uploadButton.style.borderRadius = "4px"; // Add border radius
    uploadButton.style.cursor = "pointer"; // Change cursor on hover
    uploadButton.addEventListener("change", async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
          const arrayBuffer = await file.arrayBuffer();
          const base64String = arrayBufferToBase64String(arrayBuffer);
          try {
            const response = await fetch('http://127.0.0.1:5000/chat_pdf', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ pdfData: base64String })
            });

            let accumulatedResponse = '';

            // Check if the response is okay
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Handle streamed data
            const reader = response.body.getReader();
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    console.log('Stream ended');
                    editor.commands.clearContent();
                    editor.commands.insertContent(accumulatedResponse);
                    break;
                }
                // Process each chunk of streamed data
                const markdown = new TextDecoder().decode(value);
                accumulatedResponse += markdown.slice();
                if (editor) {
                    editor.commands.insertContent(markdown);
                } else {
                    console.error('Editor object is null or undefined');
                }
            }
          } catch (error) {
              console.error('Error sending PDF data to backend:', error);
          }
      }
      wrapperDiv.remove();
    });

    // Create a div to hold the buttons
    const buttonContainer = document.createElement("div");
    buttonContainer.style.display = "flex";
    buttonContainer.style.flexDirection = "row"; // Align buttons vertically
    buttonContainer.style.marginTop = "8px"; // Add margin at the top for spacing

    // Create the close button
    const closeButton = document.createElement("button");
    closeButton.textContent = "Close";
    closeButton.style.padding = "8px 12px"; // Add padding for better appearance
    closeButton.style.marginRight = "8px"; // Add margin at the bottom to separate from generate button
    closeButton.style.border = "1px solid #ccc"; // Add border
    closeButton.style.borderRadius = "4px"; // Add border radius
    closeButton.style.backgroundColor = "#fff"; // Add background color
    closeButton.style.cursor = "pointer"; // Change cursor on hover
    closeButton.addEventListener("click", () => {
        // Remove the text block and the wrapper when the close button is clicked
        wrapperDiv.remove();
    });

    // Create elements for the string "Upload file for summarize"
    const uploadString = document.createElement('div');
    uploadString.textContent = 'Upload PDF file for automatic file summarization';

    // Create the upload button
    uploadButton.textContent = 'Upload';

    buttonContainer.appendChild(closeButton)

    wrapperDiv.appendChild(uploadString);
    wrapperDiv.appendChild(uploadButton);
    wrapperDiv.appendChild(buttonContainer);
  
    // Append the wrapper div to the text editor container
    textEditorContainer.appendChild(wrapperDiv);
  
    // Focus on the text block
    uploadString.focus();
  }

  async function popTextBlock(editor) {
    const textEditorContainer = document.querySelector(".prose"); // Assuming ".prose" is the class of the container for the text editor
    
    // Create a wrapper div for text block and close button
    const wrapperDiv = document.createElement("div");
    wrapperDiv.style.display = "flex";
    wrapperDiv.style.flexDirection = "column"; // Set flex direction to column
    wrapperDiv.style.marginBottom = "10px"; // Add some margin at the bottom for spacing
    
    // Create the text block
    const textBlock = document.createElement("textarea");
    textBlock.setAttribute("rows", "1");
    textBlock.setAttribute("cols", "100");
    textBlock.style.width = "100%"; // Set text block width to 100% to match its parent width
    textBlock.style.padding = "8px"; // Add padding for better appearance
    textBlock.style.border = "1px solid #ccc"; // Add border
    textBlock.style.borderRadius = "4px"; // Add border radius
    textBlock.style.resize = "none"; // Disable resizing
    textBlock.style.color = "#000";
    textBlock.value === "Your text block content goes here..."

    // Handle focus event
    textBlock.addEventListener("focus", function() {
      if (textBlock.value === "Your text block content goes here...") {
          textBlock.value = "";
          textBlock.style.color = "#000"; // Set text color to normal
      }
    });

    // Handle blur event
    textBlock.addEventListener("blur", function() {
      if (textBlock.value === "") {
          textBlock.value = "Your text block content goes here...";
          textBlock.style.color = "#999"; // Set text color to placeholder style
      }
    });

    textBlock.addEventListener("keydown", async function(event: KeyboardEvent) {
      if (event.key === "Enter") {
          event.preventDefault(); // Prevent default newline behavior
          displayMessage("User: " + textBlock.value)

          const messageBlock = document.createElement("textarea");
          messageBlock.setAttribute("rows", "1");
          messageBlock.setAttribute("cols", "100");
          messageBlock.style.width = "100%"; // Set text block width to 100% to match its parent width
          messageBlock.style.padding = "8px"; // Add padding for better appearance
          messageBlock.style.border = "1px solid #ccc"; // Add border
          messageBlock.style.borderRadius = "4px"; // Add border radius
          messageBlock.style.resize = "none"; // Disable resizing
          messageBlock.textContent = "AI: ";
          messageBlock.setAttribute("readonly", "true"); // Make the textarea non-modifiable
          // Append message container to chatbot box
          chatbotTextBlock.appendChild(messageBlock); // Assuming chatbotBox is the container for chatbot messages

          try {
            let note_data = "" 

            if (optionCheckbox.checked) {
              note_data = editor.getText()
            } else {
              note_data = ""
            } 
            const response = await fetch('http://127.0.0.1:5000/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ prompt: textBlock.value, note_data: note_data })
            });

            // Check if the response is okay
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Handle streamed data
            const reader = response.body.getReader();
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    console.log('Stream ended');
                    break;
                }
                // Process each chunk of streamed data
                const markdown = new TextDecoder().decode(value);
                messageBlock.textContent = messageBlock.textContent + markdown.slice();
                messageBlock.style.height = messageBlock.scrollHeight + 'px';
            }
          } catch (error) {
              console.error('Error sending PDF data to backend:', error);
          }
          
          textBlock.value = "";
          textBlock.textContent = "";
      }
    });

    const chatbotTextBlock = document.createElement("div");
    chatbotTextBlock.style.paddingTop = "10px"; // Add padding at the top

    function displayMessage(message: string): void {
      const messageBlock = document.createElement("textarea");
      messageBlock.setAttribute("rows", "1");
      messageBlock.setAttribute("cols", "100");
      messageBlock.style.width = "100%"; // Set text block width to 100% to match its parent width
      messageBlock.style.padding = "8px"; // Add padding for better appearance
      messageBlock.style.border = "1px solid #ccc"; // Add border
      messageBlock.style.borderRadius = "4px"; // Add border radius
      messageBlock.style.resize = "none"; // Disable resizing
      messageBlock.textContent = message;
      messageBlock.setAttribute("readonly", "true"); // Make the textarea non-modifiable
      // Append message container to chatbot box
      chatbotTextBlock.appendChild(messageBlock); // Assuming chatbotBox is the container for chatbot messages
    }
    
    // Create a div to hold the buttons
    const buttonContainer = document.createElement("div");
    buttonContainer.style.display = "flex";
    buttonContainer.style.flexDirection = "row"; // Align buttons vertically
    buttonContainer.style.marginTop = "8px"; // Add margin at the top for spacing
    buttonContainer.style.marginBottom = "8px";

    // Create the close button
    const closeButton = document.createElement("button");
    closeButton.textContent = "Close";
    closeButton.style.padding = "8px 12px"; // Add padding for better appearance
    closeButton.style.marginRight = "8px"; // Add margin at the bottom to separate from generate button
    closeButton.style.border = "1px solid #ccc"; // Add border
    closeButton.style.borderRadius = "4px"; // Add border radius
    closeButton.style.backgroundColor = "#fff"; // Add background color
    closeButton.style.cursor = "pointer"; // Change cursor on hover
    closeButton.addEventListener("click", () => {
        // Remove the text block and the wrapper when the close button is clicked
        wrapperDiv.remove();
    });


    const optionCheckbox = document.createElement("input");
    optionCheckbox.type = "checkbox";

    // Create elements for the string "ask AI"
    const askAIString = document.createElement('div');
    askAIString.textContent = 'Ask us anything you want, tick the box if you want to chat about the notebook.';

    // Create buttons for close and gen
    closeButton.textContent = 'Close';

    // Append buttons to the button container
    buttonContainer.appendChild(closeButton);
    buttonContainer.appendChild(optionCheckbox);

    // Append elements to the wrapper div in the desired order
    wrapperDiv.appendChild(askAIString);
    wrapperDiv.appendChild(textBlock);
    wrapperDiv.appendChild(buttonContainer);
    wrapperDiv.appendChild(chatbotTextBlock);
  
    // Append the wrapper div to the text editor container
    textEditorContainer.appendChild(wrapperDiv);
  
    // Focus on the text block
    textBlock.focus();
  }

  const lastCompletion = React.useRef("");

  React.useEffect(() => {
    if (!completion || !editor) {
      lastCompletion.current = "";
      return;
  }
    console.log(lastCompletion.current.length);
    const diff = completion.slice(lastCompletion.current.length);
    lastCompletion.current = completion;
    editor.commands.insertContent(diff);
    console.log(completion);
    console.log(diff);
  }, [completion, editor]);

  const debouncedEditorState = useDebounce(editorState, 500);
  React.useEffect(() => {
    // save to db
    if (debouncedEditorState === "") return;
    saveNote.mutate(undefined, {
      onSuccess: (data) => {
        console.log("success update!", data);
      },
      onError: (err) => {
        console.error(err);
      },
    });
  }, [debouncedEditorState]);
  return (
    <>
      <div className="flex">
        {editor && <TipTapMenuBar editor={editor} />}
        <Button disabled variant={"outline"}>
          {saveNote.isLoading ? "Saving..." : "Saved"}
        </Button>
      </div>

      <div className="prose prose-sm !max-w-none w-full mt-4">
        <EditorContent editor={editor} />
      </div>
      <div className="flex"></div>
      <span className="text-sm">
        Tip: Press{" "}
        <kbd className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">
          Ctrl + Shift + A
        </kbd>{" "}
        for AI autocomplete,
        <kbd className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">
          Ctrl + Shift + C
        </kbd>{" "}
        for AI chat,
        <kbd className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">
          Ctrl + Shift + F
        </kbd>{" "}
        for AI PDF Summarization
      </span>
    </>
  );
};

export default TipTapEditor;
