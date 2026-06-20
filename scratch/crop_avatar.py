from PIL import Image

scout_path = "frontend/public/scout_ref.png"
avatar_path = "frontend/public/leon_avatar.png"

try:
    img = Image.open(scout_path)
    w, h = img.size
    print(f"Original image format: {img.format}, dimensions: {w}x{h}")

    # Crop to center square
    min_side = min(w, h)
    left = (w - min_side) // 2
    top = (h - min_side) // 2
    right = left + min_side
    bottom = top + min_side

    cropped_img = img.crop((left, top, right, bottom))
    # Resize to a premium standard high-res square icon size (512x512)
    resized_img = cropped_img.resize((512, 512), Image.Resampling.LANCZOS)
    
    # Save as PNG overwriting leon_avatar.png
    resized_img.save(avatar_path, "PNG")
    print(f"Success! Saved cropped 512x512 scout avatar to {avatar_path}")
except Exception as e:
    print(f"Error during avatar processing: {e}")
