import os
import time
from pathlib import Path
from typing import Any, Dict, Optional
from dotenv import load_dotenv

# Resolve path to .env file: check root .env first, then local ai_llm/.env
_ROOT_ENV = Path(__file__).resolve().parent.parent / ".env"
_LOCAL_ENV = Path(__file__).resolve().parent / ".env"
_ENV_PATH = _ROOT_ENV if _ROOT_ENV.exists() else _LOCAL_ENV

load_dotenv(dotenv_path=_ROOT_ENV, override=False)
load_dotenv(dotenv_path=_LOCAL_ENV, override=False)

def _validate_api_key(key_name: str) -> str:
    """Validate that the required API key exists in environment variables."""
    api_key = os.getenv(key_name)
    if not api_key:
        raise ValueError(
            f"Missing required environment variable '{key_name}'. Please set it in your .env file."
        )
    return api_key


def generate_content(prompt: str, model_name: Optional[str] = None) -> Dict[str, Any]:
    """Generate content using Groq API via LangChain (with SDK fallback).

    Flow: User Content -> LangChain -> Groq API -> Llama Model -> Generated Content.
    Returns a dict with 'response', 'response_time', and 'error'.
    """
    try:
        api_key = _validate_api_key("GROQ_API_KEY")
        selected_model = model_name or os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b")

        start_time = time.perf_counter()

        max_tokens = int(os.getenv("GROQ_MAX_TOKENS", "800"))

        try:
            from langchain_groq import ChatGroq
            from langchain_core.prompts import PromptTemplate

            llm = ChatGroq(
                model=selected_model,
                groq_api_key=api_key,
                temperature=0.7,
                max_tokens=max_tokens,
            )
            prompt_template = PromptTemplate.from_template("{input_prompt}")
            chain = prompt_template | llm
            result = chain.invoke({"input_prompt": prompt})
            output_text = str(result.content).strip()
        except Exception:
            from groq import Groq

            client = Groq(api_key=api_key)
            completion = client.chat.completions.create(
                model=selected_model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                max_tokens=max_tokens,
            )
            output_text = completion.choices[0].message.content.strip()

        end_time = time.perf_counter()
        response_time = round(end_time - start_time, 4)

        return {
            "response": output_text,
            "response_time": response_time,
            "error": None,
        }
    except Exception as e:
        return {
            "response": None,
            "response_time": None,
            "error": str(e),
        }
