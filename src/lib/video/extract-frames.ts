// =============================
// חילוץ פריימים מסרטון בצד הלקוח
// משתמש ב-HTML5 Video + Canvas — בלי ספריות חיצוניות
// =============================

export interface ExtractedFrame {
  mediaType: 'image/jpeg';
  data: string; // base64 ללא prefix
}

export interface ExtractResult {
  frames: ExtractedFrame[];
  durationSec: number;
  width: number;
  height: number;
}

const MAX_FRAME_LONG_EDGE = 1568; // התאמה לתמיכת Sonnet 4.6 ב-vision
const FRAME_QUALITY = 0.82;

// מחלץ N פריימים שווים-מרווח לאורך הסרטון.
// מחזיר Promise שמתממש כשכל הפריימים מוכנים, או נדחה אם משהו השתבש.
export async function extractFrames(
  file: File,
  count: number = 5
): Promise<ExtractResult> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.src = url;

    const cleanup = () => URL.revokeObjectURL(url);

    video.onerror = () => {
      cleanup();
      reject(new Error('VIDEO_LOAD_FAILED'));
    };

    video.onloadedmetadata = async () => {
      try {
        const duration = video.duration;
        if (!isFinite(duration) || duration <= 0) {
          throw new Error('INVALID_DURATION');
        }

        // קביעת מימדי הקנבס — נשמור על יחס + נכווץ אם הצד הארוך גדול מהמותר
        const longEdge = Math.max(video.videoWidth, video.videoHeight);
        const scale =
          longEdge > MAX_FRAME_LONG_EDGE ? MAX_FRAME_LONG_EDGE / longEdge : 1;
        const w = Math.round(video.videoWidth * scale);
        const h = Math.round(video.videoHeight * scale);

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('NO_CANVAS_CONTEXT');

        const frames: ExtractedFrame[] = [];

        // נדגום timestamps שווים-מרווח, נמנע מקצוות מוחלטים
        for (let i = 0; i < count; i++) {
          const t = Math.min(
            duration - 0.1,
            (duration * (i + 0.5)) / count
          );

          await new Promise<void>((res, rej) => {
            const onSeeked = () => {
              video.removeEventListener('seeked', onSeeked);
              video.removeEventListener('error', onError);
              res();
            };
            const onError = () => {
              video.removeEventListener('seeked', onSeeked);
              video.removeEventListener('error', onError);
              rej(new Error('SEEK_FAILED'));
            };
            video.addEventListener('seeked', onSeeked);
            video.addEventListener('error', onError);
            video.currentTime = t;
          });

          ctx.drawImage(video, 0, 0, w, h);
          const dataUrl = canvas.toDataURL('image/jpeg', FRAME_QUALITY);
          // נסיר את ה-prefix data:image/jpeg;base64,
          const base64 = dataUrl.split(',')[1];
          frames.push({ mediaType: 'image/jpeg', data: base64 });
        }

        cleanup();
        resolve({
          frames,
          durationSec: duration,
          width: video.videoWidth,
          height: video.videoHeight,
        });
      } catch (err) {
        cleanup();
        reject(err);
      }
    };
  });
}
