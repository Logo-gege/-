
import * as THREE from 'three';

class AudioService {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bgmBuffer: AudioBuffer | null = null;
  private bgmSource: AudioBufferSourceNode | null = null;
  
  // 飞剑嗡鸣（单剑模式）
  private swordHumGain: GainNode | null = null;
  private swordHumOsc: OscillatorNode | null = null;
  private swordVibrationMod: OscillatorNode | null = null; 
  private swordHumFilter: BiquadFilterNode | null = null;

  // 阵法聚气（结阵模式）
  private arrayChargeGain: GainNode | null = null;
  private arrayChargeOsc: OscillatorNode | null = null;
  private arrayHarmonicOsc: OscillatorNode | null = null; 
  private arrayLFO: OscillatorNode | null = null;
  private arrayFilter: BiquadFilterNode | null = null;

  // 万剑降临（大招阶段）
  private rainNoiseSource: AudioBufferSourceNode | null = null;
  private rainNoiseGain: GainNode | null = null; 
  private rainRumbleSource: OscillatorNode | null = null;
  private rainRumbleGain: GainNode | null = null;
  
  private activePings: { osc: OscillatorNode; gain: GainNode }[] = [];

  private readonly ASSETS = {
    BGM: 'https://cdn.pixabay.com/audio/2022/03/10/audio_c976b052d9.mp3', 
  };

  async init() {
    if (this.context) return;
    this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }

    this.masterGain = this.context.createGain();
    this.masterGain.connect(this.context.destination);
    this.masterGain.gain.value = 0.8; 

    this.setupProfessionalSwordHum();
    this.setupProfessionalArrayCharge();
    this.loadBGM();
  }

  private async loadBGM() {
    try {
      const response = await fetch(this.ASSETS.BGM);
      const arrayBuffer = await response.arrayBuffer();
      this.bgmBuffer = await this.context!.decodeAudioData(arrayBuffer);
      this.playBGM();
    } catch (e) {
      console.warn('BGM load failed', e);
    }
  }

  private playBGM() {
    if (!this.context || !this.bgmBuffer) return;
    this.bgmSource = this.context.createBufferSource();
    this.bgmSource.buffer = this.bgmBuffer;
    this.bgmSource.loop = true;
    const bgmGain = this.context.createGain();
    bgmGain.gain.value = 0.4; 
    this.bgmSource.connect(bgmGain);
    bgmGain.connect(this.masterGain!);
    this.bgmSource.start();
  }

  private setupProfessionalSwordHum() {
    if (!this.context) return;
    this.swordHumGain = this.context.createGain();
    this.swordHumGain.gain.value = 0;
    this.swordHumFilter = this.context.createBiquadFilter();
    this.swordHumFilter.type = 'bandpass'; 
    this.swordHumFilter.Q.value = 15; 

    this.swordHumOsc = this.context.createOscillator();
    this.swordHumOsc.type = 'triangle'; 
    this.swordHumOsc.frequency.value = 1200;

    this.swordVibrationMod = this.context.createOscillator();
    this.swordVibrationMod.type = 'sine';
    this.swordVibrationMod.frequency.value = 60; 
    
    const modGain = this.context.createGain();
    modGain.gain.value = 400; 

    this.swordVibrationMod.connect(modGain);
    modGain.connect(this.swordHumOsc.frequency);

    this.swordHumOsc.connect(this.swordHumFilter);
    this.swordHumFilter.connect(this.swordHumGain);
    this.swordHumGain.connect(this.masterGain!);

    this.swordHumOsc.start();
    this.swordVibrationMod.start();
  }

  private setupProfessionalArrayCharge() {
    if (!this.context) return;
    this.arrayChargeGain = this.context.createGain();
    this.arrayChargeGain.gain.value = 0;

    this.arrayFilter = this.context.createBiquadFilter();
    this.arrayFilter.type = 'lowpass';
    this.arrayFilter.Q.value = 10;

    this.arrayChargeOsc = this.context.createOscillator();
    this.arrayChargeOsc.type = 'sawtooth';
    this.arrayChargeOsc.frequency.value = 55;

    this.arrayHarmonicOsc = this.context.createOscillator();
    this.arrayHarmonicOsc.type = 'sine';
    this.arrayHarmonicOsc.frequency.value = 220;

    this.arrayLFO = this.context.createOscillator();
    this.arrayLFO.type = 'sine';
    this.arrayLFO.frequency.value = 3;
    
    const lfoGain = this.context.createGain();
    lfoGain.gain.value = 20;
    
    this.arrayLFO.connect(lfoGain);
    lfoGain.connect(this.arrayChargeOsc.frequency);
    lfoGain.connect(this.arrayHarmonicOsc.frequency);

    this.arrayChargeOsc.connect(this.arrayFilter);
    this.arrayHarmonicOsc.connect(this.arrayFilter);
    this.arrayFilter.connect(this.arrayChargeGain);
    this.arrayChargeGain.connect(this.masterGain!);

    this.arrayChargeOsc.start();
    this.arrayHarmonicOsc.start();
    this.arrayLFO.start();
  }

  updateSwordSFX(speed: number, distance: number) {
    if (!this.swordHumGain || !this.swordHumOsc || !this.context) return;
    const now = this.context.currentTime;
    const targetFreq = 1100 + Math.min(speed, 40) * 45;
    this.swordVibrationMod!.frequency.setTargetAtTime(60 + speed * 5, now, 0.1);
    const filterFreq = 1600 + Math.min(speed, 40) * 300;
    const targetGain = Math.min(0.3, speed * 0.04) + (distance > 0.06 ? 0.04 : 0);
    this.swordHumOsc.frequency.setTargetAtTime(targetFreq, now, 0.1);
    this.swordHumFilter!.frequency.setTargetAtTime(filterFreq, now, 0.1);
    this.swordHumGain.gain.setTargetAtTime(targetGain, now, 0.15);
  }

  updateArrayCharge(progress: number, isActive: boolean) {
    if (!this.arrayChargeGain || !this.arrayChargeOsc || !this.context) return;
    const now = this.context.currentTime;
    if (!isActive) {
      this.arrayChargeGain.gain.setTargetAtTime(0, now, 0.3);
      return;
    }
    
    const p = progress / 100;
    const baseFreq = 55 + p * 165; 
    const harmonicFreq = 220 + p * 880;
    const filterFreq = 200 + p * 4000;
    const totalGain = p * 0.4;

    this.arrayChargeOsc.frequency.setTargetAtTime(baseFreq, now, 0.1);
    this.arrayHarmonicOsc!.frequency.setTargetAtTime(harmonicFreq, now, 0.1);
    this.arrayFilter!.frequency.setTargetAtTime(filterFreq, now, 0.1);
    this.arrayChargeGain.gain.setTargetAtTime(totalGain, now, 0.1);
    this.arrayLFO!.frequency.setTargetAtTime(3 + p * 20, now, 0.1);
  }

  stopArraySounds() {
    if (!this.context) return;
    const now = this.context.currentTime;

    if (this.arrayChargeGain) {
      this.arrayChargeGain.gain.cancelScheduledValues(now);
      this.arrayChargeGain.gain.setTargetAtTime(0, now, 0.2);
    }

    if (this.rainNoiseGain) {
      this.rainNoiseGain.gain.cancelScheduledValues(now);
      this.rainNoiseGain.gain.setTargetAtTime(0, now, 0.4);
    }
    if (this.rainNoiseSource) {
      try { this.rainNoiseSource.stop(now + 0.5); } catch(e) {}
      this.rainNoiseSource = null;
    }

    if (this.rainRumbleGain) {
      this.rainRumbleGain.gain.cancelScheduledValues(now);
      this.rainRumbleGain.gain.setTargetAtTime(0, now, 0.4);
    }
    if (this.rainRumbleSource) {
      try { this.rainRumbleSource.stop(now + 0.5); } catch(e) {}
      this.rainRumbleSource = null;
    }

    this.activePings.forEach(({ osc, gain }) => {
      try {
        gain.gain.cancelScheduledValues(now);
        gain.gain.setTargetAtTime(0, now, 0.1);
        osc.stop(now + 0.2);
      } catch (e) {}
    });
    this.activePings = [];
  }

  async playMonsterHowl() {
    if (!this.context) return;
    const now = this.context.currentTime;

    // 1. 低频嘶吼 (Deep Growl)
    const growl = this.context.createOscillator();
    growl.type = 'sawtooth';
    growl.frequency.setValueAtTime(120, now);
    growl.frequency.exponentialRampToValueAtTime(40, now + 1.2);
    
    const growlGain = this.context.createGain();
    growlGain.gain.setValueAtTime(0, now);
    growlGain.gain.linearRampToValueAtTime(0.5, now + 0.1);
    growlGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, now);
    filter.frequency.exponentialRampToValueAtTime(100, now + 1.0);

    // 2. 高频哀鸣 (High Shriek)
    const bufferSize = this.context.sampleRate * 1.5;
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);
    
    const shriek = this.context.createBufferSource();
    shriek.buffer = buffer;
    
    const shriekGain = this.context.createGain();
    shriekGain.gain.setValueAtTime(0, now);
    shriekGain.gain.linearRampToValueAtTime(0.3, now + 0.05);
    shriekGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    const shriekFilter = this.context.createBiquadFilter();
    shriekFilter.type = 'bandpass';
    shriekFilter.frequency.setValueAtTime(3000, now);
    shriekFilter.frequency.exponentialRampToValueAtTime(800, now + 0.8);
    shriekFilter.Q.value = 5;

    // 连接
    growl.connect(filter);
    filter.connect(growlGain);
    growlGain.connect(this.masterGain!);
    
    shriek.connect(shriekFilter);
    shriekFilter.connect(shriekGain);
    shriekGain.connect(this.masterGain!);

    growl.start();
    growl.stop(now + 1.2);
    shriek.start();
  }

  async playExplosion() {
    if (!this.context) return;
    const now = this.context.currentTime;
    
    const chime = this.context.createOscillator();
    chime.type = 'sine';
    chime.frequency.setValueAtTime(3000, now);
    chime.frequency.exponentialRampToValueAtTime(800, now + 0.6);
    const chimeGain = this.context.createGain();
    chimeGain.gain.setValueAtTime(0.6, now);
    chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
    chime.connect(chimeGain);
    chimeGain.connect(this.masterGain!);
    chime.start();
    chime.stop(now + 1.5);

    const boom = this.context.createOscillator();
    boom.type = 'triangle';
    boom.frequency.setValueAtTime(100, now);
    boom.frequency.exponentialRampToValueAtTime(20, now + 0.8);
    const boomGain = this.context.createGain();
    boomGain.gain.setValueAtTime(1.2, now);
    boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    boom.connect(boomGain);
    boomGain.connect(this.masterGain!);
    boom.start();
    boom.stop(now + 0.8);
  }

  playSwordRain() {
    if (!this.context) return;
    const now = this.context.currentTime;
    
    this.stopArraySounds(); 

    const bufferSize = this.context.sampleRate * 2;
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);
    
    const noise = this.context.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    
    const noiseGain = this.context.createGain();
    noiseGain.gain.setValueAtTime(0, now);
    noiseGain.gain.linearRampToValueAtTime(0.35, now + 0.3);
    this.rainNoiseGain = noiseGain;
    
    const highPass = this.context.createBiquadFilter();
    highPass.type = 'highpass';
    highPass.frequency.value = 3500; 

    const sweep = this.context.createBiquadFilter();
    sweep.type = 'bandpass';
    sweep.frequency.setValueAtTime(5000, now);
    sweep.frequency.exponentialRampToValueAtTime(2000, now + 5.0);
    sweep.Q.value = 5;

    noise.connect(highPass);
    highPass.connect(sweep);
    sweep.connect(noiseGain);
    noiseGain.connect(this.masterGain!);
    noise.start();
    this.rainNoiseSource = noise;

    const rumble = this.context.createOscillator();
    rumble.type = 'sine';
    rumble.frequency.value = 45;
    const rumbleGain = this.context.createGain();
    rumbleGain.gain.setValueAtTime(0, now);
    rumbleGain.gain.linearRampToValueAtTime(0.5, now + 0.8);
    
    rumble.connect(rumbleGain);
    rumbleGain.connect(this.masterGain!);
    rumble.start();
    this.rainRumbleSource = rumble;
    this.rainRumbleGain = rumbleGain;

    for (let i = 0; i < 60; i++) {
        const delay = Math.random() * 6.0;
        const pitch = 1500 + Math.random() * 3000;
        const s = this.context.createOscillator();
        s.type = 'sine';
        s.frequency.setValueAtTime(pitch, now + delay);
        s.frequency.exponentialRampToValueAtTime(pitch * 0.1, now + delay + 0.2);
        
        const sg = this.context.createGain();
        sg.gain.setValueAtTime(0, now + delay);
        sg.gain.linearRampToValueAtTime(0.12, now + delay + 0.02);
        sg.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.2);
        
        s.connect(sg);
        sg.connect(this.masterGain!);
        s.start(now + delay);
        s.stop(now + delay + 0.25);

        this.activePings.push({ osc: s, gain: sg });
    }
  }
}

export const audioService = new AudioService();
