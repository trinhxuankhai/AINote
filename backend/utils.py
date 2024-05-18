import pymupdf
from PIL import Image

def get_pdf_content(pdf_path):
    doc = pymupdf.open(pdf_path) # open a document
    pages_list = []
    for page in doc:
        pix = page.get_pixmap()
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        pages_list.append(img)

    
    instructions = "Instructions: Consider the following image that represent each page of a pdf file:"
    prompt = """
    Provide an indepth summary of the pdf file. The answer MUST include these criteria:
    - Topic: Identify the topic of the pdf file.
    - Summarize: Provide a short summarization about the information of the pdf file.
    - Page content: Provide the information of each page of the pdf file in the format of:
        + Page number: Page information
    """

    contents = [instructions]
    for page in pages_list:
        contents.append(page)
    contents.append(prompt)
    return contents