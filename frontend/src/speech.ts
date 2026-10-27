// 读音用真人录音（hugolpz/audio-cmn，CC BY-SA，来源见 public/audio/README.md），不用浏览器的语音合成：
// 合成语音读不准带声调的拼音字母。录音文件名是“音节 + 声调数字”，ü 写成 v，例如 lv3.mp3。
import { isWholeSyllable, makeSyllable } from "./pinyin";

// 声母的呼读音，和课本一样：b 读“玻”，r 读“日”。
const initialSounds: Record<string, string> = {
  b: "bo1", p: "po1", m: "mo1", f: "fo1", d: "de1", t: "te1", n: "ne1", l: "le1",
  g: "ge1", k: "ke1", h: "he1", j: "ji1", q: "qi1", x: "xi1", zh: "zhi1", ch: "chi1", sh: "shi1", r: "ri4",
  z: "zi1", c: "ci1", s: "si1", y: "yi1", w: "wu1",
};

// 韵母单独读时的录音，按课本的读法借用同音的零声母音节：i 读“衣”，ui 读“威”。
// ong 没有单独的音节，拼读时跳过韵母这一步。
const finalSounds: Record<string, string> = {
  i: "yi", u: "wu", ü: "yu", ie: "ye", üe: "yue", iu: "you", ui: "wei", un: "wen", ün: "yun", in: "yin", ing: "ying",
  ia: "ya", ua: "wa", uo: "wo", iao: "yao", uai: "wai", ian: "yan", uan: "wan", üan: "yuan", iang: "yang", uang: "wang", iong: "yong",
};

const wholeSyllableClip = "zhengti-rendu";

function clipName(syllable: string, tone: number) { return syllable.replace(/ü/g, "v") + tone; }

function finalClip(final: string, tone: number): string | undefined {
  if (final === "ong") return undefined;
  return clipName(finalSounds[final] ?? final, tone);
}

// 依次要播放的录音：整体认读音节先说“整体认读”再读音节；没有声母时直接读；其他的“声母—韵母—音节”拼读。
export function speechClips(initial: string, final: string, tone: number): string[] {
  const syllable = clipName(makeSyllable(initial, final), tone);
  if (isWholeSyllable(initial, final)) return [wholeSyllableClip, syllable];
  if (!initial) return [syllable];
  const finalSound = finalClip(final, tone);
  return [initialSounds[initial], ...(finalSound ? [finalSound] : []), syllable];
}

// 和录音对应的文字，显示在“听一听”按钮下面。
export function speechText(initial: string, final: string, tone: number): string {
  const syllable = makeSyllable(initial, final, tone);
  if (isWholeSyllable(initial, final)) return `整体认读 ${syllable}`;
  if (!initial) return syllable;
  const parts = [initial, ...(final === "ong" ? [] : [makeSyllable("", final, tone)]), syllable];
  return parts.join(" — ");
}

export function clipUrl(clip: string) { return `${import.meta.env.BASE_URL}audio/${clip}.mp3`; }
