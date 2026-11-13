import { toErrorResponse } from "@/lib/api-error";
import { authorizeStreamer } from "@/server/auth";
import { previewSpeech } from "@/server/services/tts";

export async function POST(request: Request) {
  const user = await authorizeStreamer();
  if (user instanceof Response) return user;

  try {
    const body = await request.json().catch(() => null);
    const audio = await previewSpeech(user.id, body);
    return new Response(Buffer.from(audio.bytes), {
      headers: {
        "content-type": audio.contentType,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
