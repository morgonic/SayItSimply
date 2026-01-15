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

    # gemini system instructions
    prompt = (
        f"Context:\n"
        f"Current datetime: {now}"
        f"Current date: {today}"
        f"User preferred reading level: {reading_level}.\n"
        f"User language: {language}.\n\n"
        "Instruction for action_items:\n"
        "* If the text contains relative time ('tomorrow', 'next Friday', 'in 2 weeks'), convert it to an explicit date using the current date above. Take into account the date on the text if applicable."
        "* If the exact conversion between dates is vague, keep the original phrasing in the text."
        "* Keep checklist items short, but keep important key details like money amounts, names, phone numbers, dates and deadlines, et cetera, and everything those details relate to."
        "Given the input text given below, provide this output:\n"
        "1. summary: Provide a concise plain-language summary of the input text in English.\n"
        f"2. simplified_explanation: Rewrite the text at a {reading_level} reading level.\n"
        "3. action_items: Extract concrete action items found in the text as short checklist items users can add to their to-do list. Be specific in the way you extract and phrase the action items. Include dates, money/payment amounts, names, phone numbers, and all other parameters and details that one might write down to remember to do.\n"
        f"4. translation: Translate the original text into {language} if {language} is not 'en'. Otherwise, return null.\n\n"
        f"5. mode: User-assigned document type: {mode} If the mode is 'Auto-detect', please detect the type of text it is from this list: [Sign, Menu, Form, Label, Receipt, Document, Medical, Instructions, Article, Book, Board]. Return the document type as the mode as one word from that list.\n\n"
        "Output must match the provided JSON schema."
        f"input text:\n{input}"
    )

    # gemini call
    # response_json_schema forces output shape GeminiResponse
    response = client().models.generate_content(
        model="gemini-2.5-flash", 
        config=types.GenerateContentConfig(
            # system instructions for behavior
            system_instruction="You are an accessibility assistant for the SayItSimply app. " \
            "You take real-world text and summarize, simplify at the preferred reading level for low literacy adults who need simpler language, "
            "and translate to English for adults who speak English as a second language and therefore have a lower reading level. " \
            "You are a literacy assistant as well as an accessibility tool. " \
            "You also extract and provide a list of action items for users to add to their to-do list based on what is written in the original text. " \
            "Additionally, you detect what type of document is and provide it to the user as the 'mode'.",
            # json output
            response_mime_type="application/json",
            # enforce response shape
            response_json_schema=GeminiResponse.model_json_schema()
        ),
        contents=prompt
    )
    # parse, validate model output, return
    result = GeminiResponse.model_validate_json(response.text)
    return result