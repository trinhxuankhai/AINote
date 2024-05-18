import { GoogleGenerativeAI } from "@google/generative-ai";
import { StreamingTextResponse } from "ai";
import { GoogleGenerativeAIStream } from "ai"

export async function POST(req: Request) {
  // extract the prompt from the body
  const { prompt } = await req.json();
  console.log(prompt)

  // Access your API key (see "Set up your API key" above)
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  // For text-only input, use the gemini-pro model
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest"});

  const msg = `I am writing a piece of text in a Notion text editor app and need help completing my train of thought. Here is the text so far:
  ${prompt}
  Please continue the provided text in with a consistent tone. DO NOT include the provided text.`;

  const response = await model.generateContentStream(msg);
  const stream = GoogleGenerativeAIStream(response);
  return new StreamingTextResponse(stream);
}