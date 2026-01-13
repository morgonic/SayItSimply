from google import genai
from google.genai import types
from functools import lru_cache
import os
from dotenv import load_dotenv
load_dotenv()


# least recently used overwrites old cache entries first
# saves only 1 client instance to memory
@lru_cache(maxsize=1)
def client() -> genai.Client:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("Missing GEMINI_API_KEY in backend env")
    return genai.Client(api_key=api_key)

# returns text response from gemini endpoint
def get_gemini_response() -> str:
    response = client().models.generate_content(
        model="gemini-2.5-flash", 
        config=types.GenerateContentConfig(
            system_instruction="You are an assistant for the SayItSimply app. You take real-world text and summarize, simplify at the preferred reading level, and translate to English for ESL adults. You are a literacy assistant as well as an accessibility tool."
        ),
        contents="Explain how the SayItSimply app works in a few words."
    )
    return (response.text).strip()
