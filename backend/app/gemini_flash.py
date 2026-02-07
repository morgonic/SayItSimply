from datetime import datetime
from zoneinfo import ZoneInfo
from google import genai
from google.genai import types
from functools import lru_cache
from app.schemas import GeminiResponse
import os
from dotenv import load_dotenv
from fastapi.concurrency import run_in_threadpool
load_dotenv()


# least recently used overwrites old cache entries first
# saves only 1 client instance to memory
@lru_cache(maxsize=1)
def gemini_client() -> genai.Client:
    # read gemini api key from env
    api_key = os.getenv("GEMINI_API_KEY")
    # error if no api key
    if not api_key:
        raise RuntimeError("Missing GEMINI_API_KEY in backend env")
    # return gemini client
    return genai.Client(api_key=api_key)

# get reading level to prompt at (challenge mode or not)
def compute_reading_level(reading_level: int, challenge_mode: bool, increase: int = 2, max_level: int = 9) -> int:
    # base reading level
    base = int(reading_level)
    # compute new level if there's a challenge mode increase or not
    level = base + (increase if challenge_mode else 0)
    # cap it at max_level=9, return minimum between computed level and max level
    return min(level, max_level)

# returns text response from gemini endpoint
async def get_gemini_response(
        input_text: str, 
        reading_level: int, 
        language: str, 
        mode: str,
        challenge_mode: bool
) -> GeminiResponse:
    
    # user's reading level
    base_level = int(reading_level or 6)
    # get prompted reading level based on challenge mode bool
    rewrite_level = compute_reading_level(reading_level, challenge_mode)

    # current date info
    day = datetime.now(ZoneInfo("America/New_York")) #timezone-aware
    today = day.date().isoformat() #iso date today
    now = day.isoformat(timespec="minutes") #iso datetime with minutes

    # gemini system instructions using XML tags
    system_instructions = (
        "<role>\n"
        "You are a document rewriting tool for SayItSimply.\n"
        "You rewrite input_text at the requested reading level.\n"
        "You do NOT explain or talk about the input_text beyond what is literally written.\n"
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
        "- Output should ONLY reflect information from the input_text.\n"
        "- summary and simplification MUST be in English.\n"
        "- summary: rewrite the original text as a 1-3 sentence factual summary in English.\n"
        "- simplification: rewrite the exact original text in English at the provided reading_level_grade.\n"
        "- Preserve critical details like amounts of money, names, phone numbers, addresses, deadlines, URLS.\n\n"
        
        "Simplification rules:\n"
        "- simplification MUST be a rewrite of the original text, preserving the exact same structure and meaning but at the requested reading_grade_level.\n"
        "- Do NOT refer to 'the text', 'this document', 'this message', or 'this means.'\n"
        "- Do NOT add introductions or framing ('In other words', 'Basically', et cetera)\n"
        "- Keep the ORIGINAL point of view and voice:\n"
        "  * If the input says 'you', keep 'you'.\n"
        "  * If the input is formal, keep it formal but with simpler language.\n"
        "- Preserve structure where possible: line breaks, headings, bullets, lists.\n"
        "- Do NOT add advice, opinions, or extra information that is not included in the input_text.\n\n"
        
        "Action items rules:\n"
        "- 'Action items' means real-world tasks that the reader is explicitly instructed to do.\n"
        "- ONLY include tasks that are directly stated in the input_text as instructions or requirements for the reader.\n"
        "- Each action item should be short, begin with a verb, and include a noun.\n"
        "- Each action item must be formatted as a checklist item. Example: Do X by Y-date, call X at Y number.\n"
        "- Action items also include a deadline, which should be in ISO format YYYY-MM-DD. If there is no deadline applicable, set the deadline to null.\n\n"
        
        "Translation rules:\n"
        "- If target_language == 'en', translation MUST be null unless the input_text is NOT written in English.\n"
        "- If the input_text is not written in English, output an English translation for the translation field.\n"
        "- Otherwise, translation MUST be the original input text translated into the target_language.\n\n"
        
        "Mode rules:\n"
        "- If the provided_mode != 'Auto-detect', return the provided_mode.\n"
        "- If the provided_mode == 'Auto-detect', return exactly one mode from: "
        "[Sign, Menu, Form, Label, Receipt, Document, Medical, Instructions, Article, Book, Board]\n\n"
        
        "Date time rules:\n"
        "- Use the provided current_date as the base date unless the input_text includes a document date.\n"
        "- Convert relative dates (like tomorrow, next Friday, in 2 weeks, et cetera) into ISO format YYYY-MM-DD.\n"
        "- If dates are ambiguous, keep original phrasing instead of guessing exact dates.\n\n"
        
        "Complex words rules:\n"
        "- Use the provided base_reading_level_grade to determine which words in the input_text are above the provided base_reading_level_grade.\n"
        "- ONLY extract words that are deemed more complex than the provided base_reading_level_grade.\n"
        "- Extract all words determined to be above the provided base_reading_level_grade as individual items in a list.\n"
        "- Extract words in the order they are listed in the original text.\n"
        "- Output these words as strings within a list called complex_words in the JSON schema. Do not capitalize words unless they are proper nouns.\n\n"
        
        "Complex definitions rules:\n"
        "- Use the extracted complex_words from the input_text at the provided base_reading_level_grade to output definitions for each word in the order they are listed.\n"
        "- There MUST be one definition for each word in complex_words. No more and no less.\n"
        "- List complex_definitions for each word in complex_words in the same order they are listed.\n"
        "- Generate short, simple, plain-language definitions for each word in complex_words.\n"
        "- ONLY include the definition, NOT the word being defined.\n\n"
        
        "Simple words rules:\n"
        "- Use the provided base_reading_level_grade to determine which words in the simplification text are above the provided base_reading_level_grade.\n"
        "- ONLY extract words that are deemed more complex than the provided base_reading_level_grade.\n"
        "- Extract all words determined to be above the provided base_reading_level_grade as individual items in a list.\n"
        "- Extract words in the order they are listed in the original text.\n"
        "- Output these words as strings within a list called simple_words in the JSON schema. Do not capitalize words unless they are proper nouns.\n\n"
        
        "Simple definitions rules:\n"
        "- Use the extracted simple_words from the simplification at the provided base_reading_level_grade to output definitions fro each word in the order they are listed.\n"
        "- There MUST be one definition for each word in simple_words. No more and no less.\n"
        "- List simple_definitions for each word in simple_words in the same order they are listed.\n"
        "- Generate short, simple, plain-language definitions for each word in simple_words.\n"
        "- ONLY include the definition, NOT the word being defined.\n\n"
        
        "</rules>\n\n"

        "<self_check>\n"
        "Before outputting JSON:\n"
        "- Make sure summary, simplification, and action_items are English.\n"
        "- Make sure translation is the ONLY field in target_language when target_language != 'en'.\n"
        "- Make sure output is valid JSON compliant with schema.\n"
        "</self_check>"
    )

    print("System instructions:\n", system_instructions)
    print("Prompted at reading level:", rewrite_level)
    print("User's reading level:", base_level)

    # gemini prompt using XML tags and output prefix
    prompt = (
        "<context>\n"
        f"current_datetime: {now}\n"
        f"current_date: {today}\n"
        f"base_reading_level_grade:{base_level}\n"
        f"reading_level_grade: {rewrite_level}\n"
        f"output_language: en\n"
        f"target_language: {language}\n"
        f"provided_mode: {mode}\n"
        "</context>\n\n"
        "<input_text>\n"
        f"{input_text}\n" \
        "</input_text>\n\n"
        "JSON:"
    ).strip()

    # gemini call
    def _call_gemini_sync() -> str:
        # response_json_schema forces output shape GeminiResponse
        response = gemini_client().models.generate_content(
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
        return response.text
    
    # parse, validate model output, return
    result = await run_in_threadpool(_call_gemini_sync)
    return GeminiResponse.model_validate_json(result)