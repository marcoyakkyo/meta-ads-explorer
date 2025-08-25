import requests
import json
from typing import Dict, Any, Union

import streamlit as st

from src.config import CHATBOT_HEADERS


def call_chatbot_stream(url: str, params: Dict[str, Any]=None, body: Dict[str, Any]=None, chatbot_container=None ) -> Union[dict, None]:
    print(f"Calling {url} with params: {params.keys() if params else None} and body: {body.keys() if body else None}")
    
    CHATBOT_HEADERS_STREAM = {
        "Accept": "text/event-stream",
        **CHATBOT_HEADERS
    }
    
    try:
        response = requests.post(url, params=params, json=body, headers=CHATBOT_HEADERS_STREAM, stream=True)

        if response.status_code != 200:
            print(f"Error calling {url}: {response.status_code} - {response.text[:100]}")
            return None

        content_buffer = ""

        # Display assistant chatbot_message in chat message container
        with chatbot_container:
            
            for line in response.iter_lines():
                if line:
                    # Decode the line
                    decoded_line = line.decode('utf-8')
                    
                    # Skip empty lines and non-data lines
                    if not decoded_line.startswith('data: '):
                        continue
                    
                    # Extract JSON data
                    try:
                        data_str = decoded_line[6:]  # Remove 'data: ' prefix
                        if data_str.strip():
                            data = json.loads(data_str)
                            
                            print(f"\n[STREAM DATA] {json.dumps(data, indent=2)}")

                            # Handle different message types
                            if data.get('type') == 'init':
                                st.chat_message("assistant").markdown(f"[INIT] {data.get('message', '')}")
                                
                            elif data.get('type') == 'content':
                                content_chunk = data.get('chunk', '')
                                content_buffer += content_chunk
                                st.chat_message("assistant").markdown(content_chunk)

                            elif data.get('type') == 'tool_start':
                                st.chat_message("assistant").markdown(f"\n[TOOL START] {data.get('tool_name', '')}")
                                
                            elif data.get('type') == 'tool_end':
                                st.chat_message("assistant").markdown(f"\n[TOOL END] {data.get('tool_name', '')}")
                                
                            elif data.get('type') == 'complete':
                                st.chat_message("assistant").markdown(f"\n\n[COMPLETE] Token usage: {data.get('token_usage', [])}")
                                return data

                            elif not data.get('success', True):
                                st.chat_message("assistant").markdown(f"\n[ERROR] {data.get('error', 'Unknown error')}")
                                break

                    except json.JSONDecodeError as e:
                        print(f"\n[JSON ERROR] {e}: {decoded_line}")
                        continue

        return []

    except Exception as e:
        print(f"Error calling {url}: {e}")
        return None





# def concatenate_partial_response(partial_response):
#     """
#     Concatenates the partial response into a single string.

#     Parameters:
#         partial_response (list): The chunks of the response from the OpenAI API.

#     Returns:
#         str: The concatenated response.
#     """
#     str_response = ""
#     for i in partial_response:
#         if isinstance(i, str):
#             str_response += i

#     st.markdown(str_response)

#     return str_response


# def get_response(gen_stream):
#     try:
#         # Send the request to the OpenAI API
#         # Display assistant response in chat message container
#         response = ""
#         partial_response = []
#         code_block = False

#         for chunk_content in gen_stream:
#             # check if the chunk is a code block
#             if chunk_content == '```':
#                 partial_response.append(chunk_content)
#                 code_block = True
#                 while code_block:
#                     try:
#                         chunk_content = next(gen_stream)
#                         partial_response.append(chunk_content)
#                         if chunk_content == "`\n\n":
#                             code_block = False
#                             str_response = concatenate_partial_response(partial_response)
#                             partial_response = []
#                             response += str_response

#                     except StopIteration:
#                         break

#             else:
#                 # If the chunk is not a code block, append it to the partial response
#                 partial_response.append(chunk_content)
#                 if chunk_content:
#                     if '\n' in chunk_content:
#                         str_response = concatenate_partial_response(partial_response)
#                         partial_response = []
#                         response += str_response

#         # If there is a partial response left, concatenate it and render it
#         if partial_response:
#             str_response = concatenate_partial_response(partial_response)
#             response += str_response

#         return response

#     except Exception as e:
#         print(f"An error occurred while fetching the OpenAI response: {e}")
#         return "Sorry, I couldn't process that request."

