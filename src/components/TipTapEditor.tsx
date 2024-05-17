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

type Props = { note: NoteType };

function popTextBlock() {
  const textEditorContainer = document.querySelector(".prose"); // Assuming ".prose" is the class of the container for the text editor
  
  // Create a wrapper div for text block and close button
  const wrapperDiv = document.createElement("div");
  wrapperDiv.style.display = "flex"; // Ensure the wrapper div expands to fill the container width
  wrapperDiv.style.marginBottom = "10px"; // Add some margin at the bottom for spacing
  
  // Create the text block
  const textBlock = document.createElement("textarea");
  textBlock.setAttribute("rows", "4");
  textBlock.setAttribute("cols", "50");
  textBlock.style.width = "100%"; // Set text block width to 100% to match its parent width
  textBlock.style.padding = "8px"; // Add padding for better appearance
  textBlock.style.border = "1px solid #ccc"; // Add border
  textBlock.style.borderRadius = "4px"; // Add border radius
  textBlock.style.resize = "none"; // Disable resizing
  
  // Create the close button
  const closeButton = document.createElement("button");
  closeButton.textContent = "Generate";
  closeButton.style.padding = "8px 12px"; // Add padding for better appearance
  closeButton.style.marginLeft = "8px"; // Add margin to separate from text block
  closeButton.style.border = "1px solid #ccc"; // Add border
  closeButton.style.borderRadius = "4px"; // Add border radius
  closeButton.style.backgroundColor = "#fff"; // Add background color
  closeButton.style.cursor = "pointer"; // Change cursor on hover
  closeButton.addEventListener("click", () => {
      // Remove the text block and the wrapper when the close button is clicked
      wrapperDiv.remove();
  });

  // Append text block and close button to the wrapper div
  wrapperDiv.appendChild(textBlock);
  wrapperDiv.appendChild(closeButton);

  // Append the wrapper div to the text editor container
  textEditorContainer.appendChild(wrapperDiv);

  // Focus on the text block
  textBlock.focus();
}

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
  const customText = Text.extend({
    addKeyboardShortcuts() {
      const shortcuts = {
          "Shift-a": () => {
              const prompt = this.editor.getText();
              complete(prompt);
              console.log("activate AI");
              return true;
          },
          "Shift-b": () => {
              // Code to pop a text block for entering text
              console.log("Space pressed. Pop a text block for entering text.");
              popTextBlock();
              return true;
          }
      };

      return shortcuts;
    },
  });

  const editor = useEditor({
    autofocus: true,
    extensions: [StarterKit, customText],
    content: editorState,
    onUpdate: ({ editor }) => {
      setEditorState(editor.getHTML());
    },
  });

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

      <div className="prose prose-sm w-full mt-4">
        <EditorContent editor={editor} />
      </div>
      <div className="h-4"></div>
      <span className="text-sm">
        Tip: Press{" "}
        <kbd className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">
          Shift + A
        </kbd>{" "}
        for AI autocomplete
      </span>
    </>
  );
};

export default TipTapEditor;
