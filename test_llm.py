import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
from peft import PeftModel

print("🚀 Loading fine-tuned model on RTX 4050...")

# 1. Base model setup (same quantization as training)
model_id = "unsloth/llama-3-8b-Instruct-bnb-4bit"
tokenizer = AutoTokenizer.from_pretrained(model_id)
tokenizer.pad_token = tokenizer.eos_token
tokenizer.padding_side = "right"

bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.bfloat16,
)

base_model = AutoModelForCausalLM.from_pretrained(
    model_id,
    quantization_config=bnb_config,
    device_map={"": 0}
)

# 2. Load your fine-tuned LoRA adapter weights
lora_model_path = "./sih_extraction_lora_model"
model = PeftModel.from_pretrained(base_model, lora_model_path)

print("✅ Model loaded successfully!\n")

# 3. Test on a sample Hinglish construction voice note
system_prompt = "You are an AI assistant that extracts structured JSON data from construction site voice notes."
sample_hinglish_transcript = "aaj site pe 50 cement ki bori aayi hai aur 10 labour ne kaam kiya hai. ek mixer machine kharab ho gayi."

# Format using Llama-3 chat template
messages = [
    {"role": "system", "content": system_prompt},
    {"role": "user", "content": sample_hinglish_transcript}
]

# FIX: Create text prompt first, then tokenize it properly
text_prompt = tokenizer.apply_chat_template(
    messages,
    tokenize=False,
    add_generation_prompt=True
)

inputs = tokenizer(text_prompt, return_tensors="pt").to("cuda")

# 4. Generate the JSON output
print("⏳ Generating JSON extraction...")
outputs = model.generate(
    **inputs,  # FIX: Unpack the tokenized dictionary
    max_new_tokens=256,
    temperature=0.1,  
    pad_token_id=tokenizer.eos_token_id
)

# 5. Clean and print the output
generated_text = tokenizer.decode(outputs[0], skip_special_tokens=False)
response = generated_text.split("<|start_header_id|>assistant<|end_header_id|>")[-1].replace("<|eot_id|>", "").strip()

print("\n🏗️ Input Transcript:", sample_hinglish_transcript)
print("📊 Extracted JSON:\n")
print(response)