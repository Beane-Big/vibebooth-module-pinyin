<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { finals, initials, makeSyllable, randomCombination, toneOptions, validFinalsFor } from "./pinyin";
import { getMe } from "./platform";

const name = ref("");
const selectedInitial = ref("b");
const selectedFinal = ref("a");
const selectedTone = ref(1);
const speechMessage = ref("");
const isSpeaking = ref(false);

const allowedFinals = computed(() => new Set(validFinalsFor(selectedInitial.value)));
const isValid = computed(() => allowedFinals.value.has(selectedFinal.value));
const syllable = computed(() => isValid.value ? makeSyllable(selectedInitial.value, selectedFinal.value, selectedTone.value) : "—");
const plainSyllable = computed(() => isValid.value ? makeSyllable(selectedInitial.value, selectedFinal.value) : "");

onMounted(async () => { name.value = (await getMe()).name; });

function selectInitial(initial: string) {
  selectedInitial.value = initial;
  if (!validFinalsFor(initial).includes(selectedFinal.value)) selectedFinal.value = validFinalsFor(initial)[0];
  speechMessage.value = "";
}

function selectFinal(final: string) {
  if (!allowedFinals.value.has(final)) return;
  selectedFinal.value = final;
  speechMessage.value = "";
}

function surpriseMe() {
  const next = randomCombination();
  selectedInitial.value = next.initial;
  selectedFinal.value = next.final;
  selectedTone.value = Math.floor(Math.random() * 4) + 1;
  speechMessage.value = "";
}

function speak() {
  if (!isValid.value) return;
  if (!("speechSynthesis" in window)) {
    speechMessage.value = "这个浏览器还不会说话，换一个新版浏览器试试吧。";
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(syllable.value);
  utterance.lang = "zh-CN";
  utterance.rate = 0.72;
  utterance.pitch = 1.08;
  const voice = window.speechSynthesis.getVoices().find((item) => item.lang.toLowerCase().startsWith("zh"));
  if (voice) utterance.voice = voice;
  utterance.onstart = () => { isSpeaking.value = true; speechMessage.value = "仔细听，再跟着读一遍！"; };
  utterance.onend = () => { isSpeaking.value = false; };
  utterance.onerror = () => { isSpeaking.value = false; speechMessage.value = "暂时没有找到中文语音，可以请爸爸妈妈帮忙读。"; };
  window.speechSynthesis.speak(utterance);
}
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <a class="brand" href="/apps/pinyin/" aria-label="拼音乐园首页">
        <span class="brand-mark" aria-hidden="true">拼</span>
        <span><strong>拼音乐园</strong><small>快乐开口读</small></span>
      </a>
      <div class="greeting">{{ name ? `${name}，一起练习吧！` : "一起练习吧！" }} <span>👋</span></div>
    </header>

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
          <span class="result-label">它们组成了</span>
          <div class="formula"><span>{{ selectedInitial || "∅" }}</span><b>＋</b><span>{{ selectedFinal }}</span><b>＝</b><strong>{{ syllable }}</strong></div>
          <div class="tone-picker" role="group" aria-label="选择声调">
            <button v-for="tone in toneOptions" :key="tone.value" type="button" :class="{ selected: selectedTone === tone.value }" :aria-pressed="selectedTone === tone.value" @click="selectedTone = tone.value"><span>{{ tone.mark }}</span>{{ tone.label }}</button>
          </div>
          <div class="result-actions">
            <button class="speak-button" type="button" :disabled="!isValid" @click="speak"><span aria-hidden="true">{{ isSpeaking ? "🎵" : "🔊" }}</span> {{ isSpeaking ? "正在播放" : `听一听 ${syllable}` }}</button>
            <button class="random-button" type="button" @click="surpriseMe"><span aria-hidden="true">🎲</span> 随机挑战</button>
          </div>
          <p class="speech-message">{{ speechMessage || `${plainSyllable}，读得又准又响亮！` }}</p>
        </div>
        <div class="result-decoration stars-right" aria-hidden="true">✧ · ✦</div>
      </section>
    </main>
    <footer>每天练一练，拼音更熟练 <span aria-hidden="true">🌱</span></footer>
  </div>
</template>
