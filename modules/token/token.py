import sys
import json
import tiktoken
import os

def extract_text_from_content(content):
    if isinstance(content, list):
        return ''.join(
            item.get("text", "")
            for item in content
            if isinstance(item, dict) and item.get("type") == "text"
        )
    elif isinstance(content, str):
        return content
    return ""

def count_tokens(context):
    encoding = tiktoken.encoding_for_model("gpt-4o")
    tokens_per_message = 3
    tokens_per_name = 1

    total_tokens = 0
    for message in context:
        total_tokens += tokens_per_message
        for key, value in message.items():
            if key == "content":
                total_tokens += len(encoding.encode(extract_text_from_content(value)))
            elif key == "name":
                total_tokens += tokens_per_name
                total_tokens += len(encoding.encode(value))
            else:
                total_tokens += len(encoding.encode(value))
    total_tokens += 3
    return total_tokens

if __name__ == "__main__":
    try:
        file_path = sys.argv[1]
        with open(file_path, "r", encoding="utf-8") as f:
            context = json.load(f)
        print(count_tokens(context))
        os.remove(file_path)  # optional: remove file from inside Python
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)
