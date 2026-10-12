import sys
import time

# Ensure UTF-8 output encoding for Windows terminals
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

try:
    from ai_llm.content_generator import (
        generate_summary,
        generate_linkedin_post,
        generate_twitter_content,
        generate_instagram_caption,
        generate_youtube_content,
    )
except ImportError:
    from content_generator import (
        generate_summary,
        generate_linkedin_post,
        generate_twitter_content,
        generate_instagram_caption,
        generate_youtube_content,
    )

SOURCE_TEXT = """ Maintaining a healthy lifestyle requires attention to several daily habits. Regular physical activity, balanced
food choices, adequate sleep, and stress management can all contribute to overall well-being.
Regular exercise can help people remain physically active and support daily energy levels. Different activities
such as walking, cycling, stretching, or sports can be included according to individual preferences and
routines.
Food choices are also important. A balanced diet can provide the nutrients needed by the body and can
encourage healthier eating habits. Drinking enough water is another simple part of maintaining daily health
routines.
Sleep plays an important role in recovery and concentration. Maintaining a regular sleep schedule can help
people create a more consistent daily routine.
Stress management is also useful. Activities such as exercise, hobbies, relaxation, and spending time with
friends or family can help people manage everyday pressure.
Overall, a healthy lifestyle is built through consistent daily habits rather than a single activity. Small and
practical changes can make routines easier to maintain over time
"""


def run_tests():
    summary_res = generate_summary(SOURCE_TEXT)
    time.sleep(12)
    linkedin_res = generate_linkedin_post(SOURCE_TEXT)
    time.sleep(12)
    twitter_res = generate_twitter_content(SOURCE_TEXT)
    time.sleep(12)
    instagram_res = generate_instagram_caption(SOURCE_TEXT)
    time.sleep(12)
    youtube_res = generate_youtube_content(SOURCE_TEXT)

    print("==================================================")
    print("PRISM CONTENT GENERATOR TEST")
    print("==================================================\n")

    print("========== 1. SUMMARY ==========")
    print(summary_res.get("response") or summary_res.get("error"))
    print()

    print("========== 2. LINKEDIN POST ==========")
    print(linkedin_res.get("response") or linkedin_res.get("error"))
    print()

    print("========== 3. TWITTER/X POST ==========")
    print(twitter_res.get("response") or twitter_res.get("error"))
    print()

    print("========== 4. INSTAGRAM CAPTION ==========")
    print(instagram_res.get("response") or instagram_res.get("error"))
    print()

    print("========== 5. YOUTUBE TITLE + DESCRIPTION ==========")
    print(youtube_res.get("response") or youtube_res.get("error"))
    print()

    print("==================================================")
    print("RESPONSE TIMES")
    print("==================================================")
    print(f"Summary: {summary_res.get('response_time')} seconds")
    print(f"LinkedIn: {linkedin_res.get('response_time')} seconds")
    print(f"Twitter/X: {twitter_res.get('response_time')} seconds")
    print(f"Instagram: {instagram_res.get('response_time')} seconds")
    print(f"YouTube: {youtube_res.get('response_time')} seconds")
    print()

    print("==================================================")
    print("ERROR STATUS")
    print("==================================================")
    print(f"Summary: {summary_res.get('error')}")
    print(f"LinkedIn: {linkedin_res.get('error')}")
    print(f"Twitter/X: {twitter_res.get('error')}")
    print(f"Instagram: {instagram_res.get('error')}")
    print(f"YouTube: {youtube_res.get('error')}")


if __name__ == "__main__":
    run_tests()
