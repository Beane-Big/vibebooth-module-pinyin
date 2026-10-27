<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { finals, initials, isWholeSyllable, makeSyllable, randomCombination, toneOptions, validFinalsFor } from "./pinyin";
import { clipUrl, finalClip, initialClip, speechSteps, speechText, syllableClip, type SpeechPart, type SpeechStep } from "./speech";

const selectedInitial = ref("b");
const selectedFinal = ref("a");
const selectedTone = ref(1);
const speechMessage = ref("");
const isSpeaking = ref(false);
const playingPart = ref<SpeechPart | null>(null);

const allowedFinals = computed(() => new Set(validFinalsFor(selectedInitial.value)));
const isValid = computed(() => allowedFinals.value.has(selectedFinal.value));
const isWhole = computed(() => isValid.value && isWholeSyllable(selectedInitial.value, selectedFinal.value));
const syllable = computed(() => isValid.value ? makeSyllable(selectedInitial.value, selectedFinal.value, selectedTone.value) : "—");
const spelling = computed(() => isValid.value ? speechText(selectedInitial.value, selectedFinal.value, selectedTone.value) : "");
const initialSound = computed(() => initialClip(selectedInitial.value));
const finalSound = computed(() => isValid.value ? finalClip(selectedFinal.value, selectedTone.value) : undefined);

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
  if ("speechSynthesis" in window) window.speechSynthesis.removeEventListener("voiceschanged", loadChineseVoice);
});

function selectInitial(initial: string) {
  stopSpeaking();
  selectedInitial.value = initial;
  if (!validFinalsFor(initial).includes(selectedFinal.value)) selectedFinal.value = validFinalsFor(initial)[0];
  speechMessage.value = "";
}

function selectFinal(final: string) {
  if (!allowedFinals.value.has(final)) return;
  stopSpeaking();
  selectedFinal.value = final;
  speechMessage.value = "";
}

function selectTone(tone: number) {
  stopSpeaking();
  selectedTone.value = tone;
  speechMessage.value = "";
}

function surpriseMe() {
  stopSpeaking();
  const next = randomCombination();
  selectedInitial.value = next.initial;
  selectedFinal.value = next.final;
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
  if (isValid.value) play(speechSteps(selectedInitial.value, selectedFinal.value, selectedTone.value));
}

// 点公式里的声母、韵母或者音节，只读这一部分。
function speakPart(part: SpeechPart) {
  if (!isValid.value) return;
  const clip = part === "initial" ? initialSound.value : part === "final" ? finalSound.value : syllableClip(selectedInitial.value, selectedFinal.value, selectedTone.value);
  if (clip) play([{ clip, part }]);
}
</script>

<template>
  <div class="app-shell">
    <main class="content">
      <section class="hero" aria-labelledby="page-title">
        <div class="hero-copy">
          <span class="eyebrow">🌟 今天也要大声读</span>
          <h1 id="page-title">声母韵母碰碰车</h1>
          <p>选一个声母，再选一个韵母，听听它们碰在一起怎么读！</p>
        </div>
        <div class="hero-art" aria-hidden="true"><span class="cloud cloud-one"></span><span class="cloud cloud-two"></span><span class="rainbow">🌈</span><span class="mascot">🐼</span></div>
      </section>

      <section class="learning-card">
        <div class="picker-column">
          <div class="section-heading"><span class="step step-blue">1</span><div><h2>选声母</h2><p>小火车的车头</p></div></div>
          <div class="choice-grid initials-grid" role="group" aria-label="选择声母">
            <button v-for="initial in initials" :key="initial.value || 'none'" class="sound-chip initial-chip" :class="{ selected: selectedInitial === initial.value }" type="button" :aria-pressed="selectedInitial === initial.value" @click="selectInitial(initial.value)">{{ initial.label }}</button>
          </div>
        </div>

        <div class="plus-sign" aria-hidden="true">＋</div>

        <div class="picker-column">
          <div class="section-heading"><span class="step step-orange">2</span><div><h2>选韵母</h2><p>小火车的车厢</p></div></div>
          <div class="choice-grid finals-grid" role="group" aria-label="选择韵母">
            <button v-for="final in finals" :key="final" class="sound-chip final-chip" :class="{ selected: selectedFinal === final }" :disabled="!allowedFinals.has(final)" type="button" :aria-pressed="selectedFinal === final" @click="selectFinal(final)">{{ final }}</button>
          </div>
          <p class="helper-text"><span aria-hidden="true">💡</span> 灰色的韵母不能和这个声母组队哦</p>
        </div>
      </section>

      <section class="result-card" aria-live="polite">
        <div class="result-decoration stars-left" aria-hidden="true">✦ · ✧</div>
        <div class="result-main">
          <span class="result-label">{{ isWhole ? "这是整体认读音节" : "它们组成了" }}，点一点可以单独听</span>
          <div class="formula">
            <button class="formula-part" :class="{ playing: playingPart === 'initial' }" type="button" :disabled="!initialSound" :aria-label="`听声母 ${selectedInitial}`" @click="speakPart('initial')"><span>{{ selectedInitial || "∅" }}</span></button>
            <b>＋</b>
            <button class="formula-part" :class="{ playing: playingPart === 'final' }" type="button" :disabled="!finalSound" :aria-label="`听韵母 ${selectedFinal}`" @click="speakPart('final')"><span>{{ selectedFinal }}</span></button>
            <b>＝</b>
            <button class="formula-part" :class="{ playing: playingPart === 'syllable' }" type="button" :disabled="!isValid" :aria-label="`听音节 ${syllable}`" @click="speakPart('syllable')"><strong>{{ syllable }}</strong></button>
          </div>
          <div class="tone-picker" role="group" aria-label="选择声调">
            <button v-for="tone in toneOptions" :key="tone.value" type="button" :class="{ selected: selectedTone === tone.value }" :aria-pressed="selectedTone === tone.value" @click="selectTone(tone.value)"><span>{{ tone.mark }}</span>{{ tone.label }}</button>
          </div>
          <div class="result-actions">
            <button class="speak-button" type="button" :disabled="!isValid" @click="speak"><span aria-hidden="true">{{ isSpeaking ? "🎵" : "🔊" }}</span> {{ isSpeaking ? "正在播放" : `听一听 ${syllable}` }}</button>
            <button class="random-button" type="button" @click="surpriseMe"><span aria-hidden="true">🎲</span> 随机挑战</button>
          </div>
          <p class="speech-message">{{ speechMessage || spelling }}</p>
        </div>
        <div class="result-decoration stars-right" aria-hidden="true">✧ · ✦</div>
      </section>
    </main>
    <footer>每天练一练，拼音更熟练 <span aria-hidden="true">🌱</span></footer>
  </div>
</template>
