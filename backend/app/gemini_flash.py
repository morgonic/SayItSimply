from datetime import datetime
from zoneinfo import ZoneInfo
from google import genai
from google.genai import types
from functools import lru_cache
from app.schemas import GeminiResponse
import os
from dotenv import load_dotenv
load_dotenv()


# least recently used overwrites old cache entries first
# saves only 1 client instance to memory
@lru_cache(maxsize=1)
def client() -> genai.Client:
    # read gemini api key from env
    api_key = os.getenv("GEMINI_API_KEY")
    # error if no api key
    if not api_key:
        raise RuntimeError("Missing GEMINI_API_KEY in backend env")
    # return gemini client
    return genai.Client(api_key=api_key)

# returns text response from gemini endpoint
def get_gemini_response(input: str, reading_level: int, language: str, mode: str) -> GeminiResponse:

    # current date info
    day = datetime.now(ZoneInfo("America/New_York")) #timezone-aware
    today = day.date().isoformat() #iso date today
    now = day.isoformat(timespec="minutes") #iso datetime with minutes

    # gemini system instructions using XML tags
    system_instructions = (
        "<role>\n"
        "You are a document rewriting tool for SayItSimply.\n"
        "You rewrite input text at the requested reading level.\n"
        "You do NOT explain the text or talk about the text.\n"
        "</role>\n\n"
        
        "<constraints>\n"
        "- Verbosity: Medium\n"
        "- Tone: Neutral\n"
        "- Tone guidance:\n"
        "  * Write like the original document, just simpler. NO conversational tone.\n"
        "</constraints>\n\n"
        
        "<output_format>\n"
        "You must produce one single JSON object that matches the structure of the provided response JSON schema.\n"
        "The JSON object must be your ONLY output.\n"
        "</output_format>\n\n"
        
        "<rules>\n"
        "General rules:\n"
        "- Use ONLY information from the input_text. ONLY include detailed information like "
        "names, dates, amounts of money, et cetera, if it is included in the input text.\n"
        "- summary and simplified_explanation MUST be in English.\n"
        "- summary: rewrite the original text as a 1-3 sentence factual summary in English.\n"
        "- simplified_explanation: rewrite in English at provided reading_level_grade.\n"
        "- Preserve critical details like amounts of money, names, phone numbers, addresses, deadlines, URLS.\n\n"
        "Simplified explanation rules:\n"
        "- simplified_explanation MUST be a rewrite of the original text, NOT an explanation of it.\n"
        "- Do not refer to 'the text', 'this document', 'this message', or 'this means.'\n"
        "- Do not add introductions or framing ('In other words', 'Basically', et cetera)\n"
        "- Keep the original point of view and voice:\n"
        "  * If the input says 'you', keep 'you'.\n"
        "  * If the input is formal, keep it formal but with simpler language.\n"
        "- Preserve structure where possible: line breaks, headings, bullets, lists.\n"
        "- Do NOT add advice, opinions, or extra information that is not included in the input_text.\n\n"
        "Action items rules:\n"
        "- ONLY extract tasks that are concrete instructions required by the input text.\n"
        "- Do NOT add suggested tasks unless the input explicitly says so.\n"
        "- Each action item should be short and begin with a verb.\n"
        "- Action items should include relevant details like dates, amounts, names, phone numbers, et cetera.\n\n"
        "Translation rules:\n"
        "- If target_language == 'en', translation MUST be null.\n"
        "- Otherwise, translation MUST be the original input text translated into the target_language.\n\n"
        "Mode rules:\n"
        "- If the provided_mode != 'Auto-detect', return the provided_mode.\n"
        "- If the provided_mode == 'Auto-detect', return exactly one mode from: "
        "[Sign, Menu, Form, Label, Receipt, Document, Medical, Instructions, Article, Book, Board]\n\n"
        "Date time rules:\n"
        "- Use the provided current_date as the base date unless the input_text includes a document date.\n"
        "- Convert relative dates (like tomorrow, next Friday, in 2 weeks, et cetera) into ISO format YYYY-MM-DD.\n"
        "- If dates are ambiguous, keep original phrasing instead of guessing exact dates.\n"
        "</rules>\n\n"
        "<self_check>\n"
        "Before outputting JSON:\n"
        "- Make sure summary, simplified_explanation, and action_items are English.\n"
        "- Make sure translation is the ONLY field in target_language when target_language != 'en'.\n"
        "- Make sure output is valid JSON compliant with schema.\n"
    )

    print(system_instructions)

    # gemini prompt using XML tags and output prefix
    prompt = (
        "<context>\n"
        f"current_datetime: {now}\n"
        f"current_date: {today}\n"
        f"reading_level_grade: {reading_level}\n"
        f"output_language: en\n"
        f"target_language: {language}\n"
        f"provided_mode: {mode}\n"
        "</context>\n\n"
        "<input_text>\n"
        f"{input}\n" \
        "</input_text>\n\n"
        "JSON:"
    ).strip()

    # gemini call
    # response_json_schema forces output shape GeminiResponse
    response = client().models.generate_content(
        model="gemini-2.5-flash", 
        config=types.GenerateContentConfig(
            # system instructions for behavior
            system_instruction=system_instructions,
            # json output
            response_mime_type="application/json",
            # enforce response shape
            response_json_schema=GeminiResponse.model_json_schema(),
            # lower temperature to reduce variability
            temperature=0.2
        ),
        contents=prompt
    )
    # parse, validate model output, return
    result = GeminiResponse.model_validate_json(response.text)
    return result