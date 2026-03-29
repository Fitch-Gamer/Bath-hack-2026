import argparse
import os
import time

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()
client = OpenAI(base_url="https://openrouter.ai/api/v1", api_key=os.getenv("OPENROUTER_API_KEY"))


def promptgen(prompt):
    start_time = time.time()

    response = client.responses.create(model="gpt-5.4",
                                       instructions="You are a professional interviewer and meeting facilitator. Your goal is to help users practice on-camera communication skills. Generate a single, thought-provoking, open-ended interview question for the user to answer aloud. Limit the question to ten words or fewer.",
                                       input=prompt, )

    print(f"Response generated in {time.time() - start_time} seconds.")
    return response.output_text


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('--prompt', type=str, required=True)
    args = parser.parse_args()

    result = promptgen(args.prompt)
    print(result)
