<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { canCombine, finals, initials, isMedialAvailable, joinFinal, makeSyllable, medials, randomCombination, splitFinal, toneOptions } from "./pinyin";
import { clipUrl, finalClip, initialClip, medialClip, speechSteps, speechText, syllableClip, type SpeechPart, type SpeechStep } from "./speech";

const selectedInitial = ref("b");
// 介母只在三拼音节里用，空字符串表示没有。selectedFinal 是韵母表里的韵母，和介母连起来才是完整的韵母（u + ang = uang）。
const selectedMedial = ref("");
// 三拼音节在韵母表里连着点：点了 i、u、ü 之后的一小段时间里再点韵母，就拼成 uang 这样的韵母。
// 这段时间里 pendingMedial 记着刚点的介母，超时就当只点了 u。
const MEDIAL_WINDOW_MS = 2000;
const pendingMedial = ref("");
let pendingTimer: ReturnType<typeof setTimeout> | undefined;
const selectedFinal = ref("a");
const selectedTone = ref(1);
const speechMessage = ref("");
const isSpeaking = ref(false);
const playingPart = ref<SpeechPart | null>(null);

const fullFinal = computed(() => joinFinal(selectedMedial.value, selectedFinal.value) ?? "");
const isValid = computed(() => canCombine(selectedInitial.value, selectedMedial.value, selectedFinal.value));
const syllable = computed(() => isValid.value ? makeSyllable(selectedInitial.value, fullFinal.value, selectedTone.value) : "—");
const spelling = computed(() => isValid.value ? speechText(selectedInitial.value, fullFinal.value, selectedTone.value) : "");
const initialSound = computed(() => initialClip(selectedInitial.value));
const finalParts = computed(() => ({ medial: selectedMedial.value || undefined, rest: selectedFinal.value }));
const finalSound = computed(() => isValid.value ? finalClip(selectedFinal.value, selectedTone.value) : undefined);

// 韵母按钮能不能点亮：等着接韵母时，只亮能接在这个介母后面的；平时亮能直接组队的、能当介母的 i、u、ü，以及当前三拼里的韵母（如 zuo 的 o）。
function isFinalAvailable(final: string): boolean {
  const initial = selectedInitial.value;
  if (pendingMedial.value) return final === pendingMedial.value || canCombine(initial, pendingMedial.value, final);
  if (final === selectedFinal.value && isValid.value) return true;
  return canCombine(initial, "", final) || ((medials as readonly string[]).includes(final) && isMedialAvailable(initial, final));
}

function clearPending() {
  clearTimeout(pendingTimer);
  pendingMedial.value = "";
}

function startPending(medial: string) {
  clearPending();
  pendingMedial.value = medial;
  pendingTimer = setTimeout(clearPending, MEDIAL_WINDOW_MS);
}

// 每次点“听一听”都换一轮播放，上一轮没播完的录音直接停掉。
// 一直用同一个播放器换录音：iPad 上只有点按时开始播放的播放器，后面才能接着自动播放。
const player = new Audio();
let playRound = 0;
let finishClip: (() => void) | null = null;
// 设备上的中文语音；语音列表是异步加载的，没有中文语音时用录音。
let chineseVoice: SpeechSynthesisVoice | undefined;

function loadChineseVoice() {
  chineseVoice = window.speechSynthesis.getVoices().find((voice) => /^zh[-_](CN|Hans)/i.test(voice.lang));
}

onMounted(() => {
  if (!("speechSynthesis" in window)) return;
  loadChineseVoice();
  window.speechSynthesis.addEventListener("voiceschanged", loadChineseVoice);
});

function stopSpeaking() {
  playRound += 1;
  player.pause();
  if (chineseVoice) window.speechSynthesis.cancel();
  finishClip?.();
  finishClip = null;
  isSpeaking.value = false;
  playingPart.value = null;
}

onBeforeUnmount(() => {
  stopSpeaking();
  clearPending();
  if ("speechSynthesis" in window) window.speechSynthesis.removeEventListener("voiceschanged", loadChineseVoice);
});

// 换了声母后，原来的介母、韵母拼不上时，换成第一个能拼上的。
function keepCombinable() {
  if (!isMedialAvailable(selectedInitial.value, selectedMedial.value)) selectedMedial.value = "";
  if (!canCombine(selectedInitial.value, selectedMedial.value, selectedFinal.value)) {
    selectedFinal.value = finals.find((final) => canCombine(selectedInitial.value, selectedMedial.value, final)) ?? selectedFinal.value;
  }
}

// 点声母、韵母按钮时选中并读出来；“无”声母和 ong 没有单独的录音，只选中不读。
function selectInitial(initial: string) {
  stopSpeaking();
  clearPending();
  speechMessage.value = "";
  selectedInitial.value = initial;
  keepCombinable();
  const clip = initialClip(initial);
  if (clip) play([{ clip }]);
}

// 刚点过 i、u、ü 又点了能接上的韵母，拼成三拼；否则按单个韵母选中。灰色的韵母点了只读，不选中。
function selectFinal(final: string) {
  stopSpeaking();
  speechMessage.value = "";
  const initial = selectedInitial.value;
  const medial = pendingMedial.value;
  clearPending();
  if (medial && canCombine(initial, medial, final)) {
    selectedMedial.value = medial;
    selectedFinal.value = final;
  } else {
    if (canCombine(initial, "", final)) {
      selectedMedial.value = "";
      selectedFinal.value = final;
    }
    if ((medials as readonly string[]).includes(final) && isMedialAvailable(initial, final)) startPending(final);
  }
  const clip = finalClip(final, selectedTone.value);
  if (clip) play([{ clip }]);
}

function selectTone(tone: number) {
  stopSpeaking();
  selectedTone.value = tone;
  speechMessage.value = "";
}

function surpriseMe() {
  stopSpeaking();
  clearPending();
  const next = randomCombination();
  const { medial, rest } = splitFinal(next.initial, next.final);
  selectedInitial.value = next.initial;
  selectedMedial.value = medial ?? "";
  selectedFinal.value = rest;
  selectedTone.value = Math.floor(Math.random() * 4) + 1;
  speechMessage.value = "";
}

// 播完或者被停掉都算结束，停掉时由调用方按轮次判断要不要接着播。
function playClip(clip: string): Promise<void> {
  return new Promise((resolve, reject) => {
    finishClip = resolve;
    player.onended = () => resolve();
    player.onerror = () => reject(new Error(clip));
    player.muted = false;
    player.src = clipUrl(clip);
    player.play().catch(reject);
  });
}

// 用设备的中文语音读汉字，读完或者被停掉都算结束。
function speakText(text: string, voice: SpeechSynthesisVoice): Promise<void> {
  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voice;
    utterance.lang = voice.lang;
    finishClip = resolve;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}

async function play(steps: SpeechStep[]) {
  stopSpeaking();
  const round = playRound;
  isSpeaking.value = true;
  speechMessage.value = "";
  // 第一步用语音合成时，先在点按里让播放器静音播一下：iPad 上只有点按时播过的播放器，后面才能自动播放录音。
  if (steps[0]?.text && chineseVoice) {
    player.muted = true;
    player.src = clipUrl(steps[steps.length - 1].clip);
    player.play().then(() => { if (player.muted) player.pause(); }).catch(() => {});
  }
  try {
    for (const step of steps) {
      if (round !== playRound) return;
      playingPart.value = step.part ?? null;
      if (step.text && chineseVoice) await speakText(step.text, chineseVoice);
      else await playClip(step.clip);
    }
  } catch {
    if (round === playRound) speechMessage.value = "读音没有加载出来，检查一下网络再试试。";
  } finally {
    if (round === playRound) { isSpeaking.value = false; playingPart.value = null; }
  }
}

function speak() {
  if (isValid.value) play(speechSteps(selectedInitial.value, fullFinal.value, selectedTone.value));
}

// 点公式里的声母、韵母或者音节，只读这一部分。
function speakPart(part: SpeechPart) {
  if (!isValid.value) return;
  const medial = finalParts.value.medial;
  const clip = part === "initial" ? initialSound.value
    : part === "medial" ? (medial ? medialClip(medial) : undefined)
    : part === "final" ? finalSound.value
    : syllableClip(selectedInitial.value, fullFinal.value, selectedTone.value);
  if (clip) play([{ clip, part }]);
}
</script>

<template>
  <div class="app-shell">
    <main class="content">
      <section class="learning-card" aria-label="选声母和韵母">
        <div class="picker-column initials-column">
          <div class="section-heading" aria-hidden="true"><span class="step step-blue">1</span></div>
          <div class="choice-grid initials-grid" role="group" aria-label="选择声母">
            <button v-for="initial in initials" :key="initial.value || 'none'" class="sound-chip initial-chip" :class="{ selected: selectedInitial === initial.value }" type="button" :aria-pressed="selectedInitial === initial.value" @click="selectInitial(initial.value)">{{ initial.label }}</button>
          </div>
        </div>

        <div class="picker-column finals-column">
          <div class="section-heading" aria-hidden="true"><span class="step step-orange">2</span></div>
          <div class="choice-grid finals-grid" role="group" aria-label="选择韵母，三拼音节先点 i、u、ü 再点韵母">
            <button v-for="final in finals" :key="final" class="sound-chip final-chip" :class="{ selected: selectedFinal === final, medial: !pendingMedial && selectedMedial === final, pending: pendingMedial === final, unavailable: !isFinalAvailable(final) }" type="button" :aria-pressed="selectedFinal === final" @click="selectFinal(final)">{{ final }}</button>
          </div>
        </div>
      </section>

      <section class="result-card" aria-live="polite">
        <div class="result-decoration stars-left" aria-hidden="true">✦ · ✧</div>
        <div class="result-main">
          <div class="formula">
            <button class="formula-part" :class="{ playing: playingPart === 'initial' }" type="button" :disabled="!initialSound" :aria-label="`听声母 ${selectedInitial}`" @click="speakPart('initial')"><span>{{ selectedInitial || "∅" }}</span></button>
            <template v-if="finalParts.medial">
              <b>＋</b>
              <button class="formula-part" :class="{ playing: playingPart === 'medial' }" type="button" :disabled="!isValid" :aria-label="`听介母 ${finalParts.medial}`" @click="speakPart('medial')"><span>{{ finalParts.medial }}</span></button>
            </template>
            <b>＋</b>
            <button class="formula-part" :class="{ playing: playingPart === 'final' }" type="button" :disabled="!finalSound" :aria-label="`听韵母 ${finalParts.rest}`" @click="speakPart('final')"><span>{{ finalParts.rest }}</span></button>
            <b>＝</b>
            <button class="formula-part" :class="{ playing: playingPart === 'syllable' }" type="button" :disabled="!isValid" :aria-label="`听音节 ${syllable}`" @click="speakPart('syllable')"><strong>{{ syllable }}</strong></button>
          </div>
          <div class="tone-picker" role="group" aria-label="选择声调">
            <button v-for="tone in toneOptions" :key="tone.value" type="button" :class="{ selected: selectedTone === tone.value }" :aria-pressed="selectedTone === tone.value" :aria-label="tone.label" @click="selectTone(tone.value)"><span aria-hidden="true">{{ tone.mark }}</span></button>
          </div>
          <div class="result-actions">
            <button class="speak-button" type="button" :disabled="!isValid" :aria-label="`听 ${syllable}`" @click="speak"><span aria-hidden="true">{{ isSpeaking ? "🎵" : "🔊" }}</span> {{ syllable }}</button>
            <button class="random-button" type="button" aria-label="随机换一个" @click="surpriseMe"><span aria-hidden="true">🎲</span></button>
          </div>
          <p class="speech-message">{{ speechMessage || spelling }}</p>
        </div>
        <div class="result-decoration stars-right" aria-hidden="true">✧ · ✦</div>
      </section>
    </main>
  </div>
</template>
