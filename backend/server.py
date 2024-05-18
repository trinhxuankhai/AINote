from flask import Flask, request, Response
from flask_cors import CORS
import google.generativeai as genai
from PIL import PngImagePlugin
from dotenv import load_dotenv
from utils import get_pdf_content
import base64
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

load_dotenv()
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-1.5-pro-latest')

@app.route('/chat_pdf', methods=['POST'])
def upload_pdf():
    try:
        pdf_data = request.json.get('pdfData')
        tmp_path = 'uploaded_file.pdf'
        if pdf_data:
            # Convert ArrayBuffer to bytes
            pdf_bytes = base64.b64decode(pdf_data)
            # Save the PDF file
            with open(tmp_path, 'wb') as f:
                f.write(pdf_bytes)
        else:
            return {'error': 'No PDF data provided'}, 400
    except Exception as e:
        print(str(e))
        return {'error': str(e)}, 500
    
    contents = get_pdf_content(tmp_path)
    response = model.generate_content(contents, stream=True)
    
    def generate_chunks():
        for chunk in response:
            yield chunk.text
    
    return Response(generate_chunks(), mimetype='text/plain')


@app.route('/chat', methods=['POST'])
def chat():
    try:
        prompt = request.json.get('prompt')
        note_data = request.json.get('note_data')
    except Exception as e:
        print(str(e))
        return {'error': str(e)}, 500
    
    if note_data == "":
        response = model.generate_content(prompt, stream=True)
    else:
        system_prompt = f"""
        Instructions: Consider the following information from a notebook:
        {note_data}
        Your task is to answer the following question about the notebook."""
        response = model.generate_content(system_prompt + "\n" + prompt, stream=True)
        
    def generate_chunks():
        for chunk in response:
            yield chunk.text
    
    return Response(generate_chunks(), mimetype='text/plain')

if __name__ == '__main__':
    app.run(debug=True)