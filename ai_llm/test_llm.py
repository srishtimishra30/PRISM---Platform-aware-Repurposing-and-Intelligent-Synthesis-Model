from llm_service import generate_content

TEST_PROMPT = """Summarize this text in 3 concise points:

PRISM is an AI-powered platform that accepts content such as
blogs, YouTube videos, podcasts, PDFs, and raw text and
repurposes it into platform-specific content for LinkedIn,
Twitter/X, Instagram, YouTube, and email newsletters."""

if __name__ == "__main__":
    result = generate_content(TEST_PROMPT)

    print("========== GROQ / LLAMA ==========\n")
    if result["error"]:
        print(f"Error: Could not complete Groq call ({result['error']})")
    else:
        print(f"Response:\n{result['response']}\n")
        print(f"Response Time:\n{result['response_time']} seconds")
