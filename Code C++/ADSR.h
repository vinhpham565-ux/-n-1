#pragma once
#ifndef ADSR_H
#define ADSR_H

#include <cmath>
#include <algorithm>

class EnvelopeGenerator {
public:
    enum EnvelopeStage {
        ENVELOPE_STAGE_OFF = 0,
        ENVELOPE_STAGE_ATTACK,
        ENVELOPE_STAGE_DECAY,
        ENVELOPE_STAGE_SUSTAIN,
        ENVELOPE_STAGE_RELEASE,
        kNumEnvelopeStages
    };

    EnvelopeGenerator(double sampleRate) :
        minimumLevel(0.0001),
        currentStage(ENVELOPE_STAGE_OFF),
        currentLevel(0.0),
        multiplier(1.0),
        sampleRate(sampleRate),
        currentSampleIndex(0),
        nextStageSampleIndex(0)
    {
        stageValue[ENVELOPE_STAGE_OFF] = 0.0;
        stageValue[ENVELOPE_STAGE_ATTACK] = 0.01;  // 10ms Attack
        stageValue[ENVELOPE_STAGE_DECAY] = 0.5;    // 500ms Decay
        stageValue[ENVELOPE_STAGE_SUSTAIN] = 0.5;  // 50% Sustain volume
        stageValue[ENVELOPE_STAGE_RELEASE] = 1.0;  // 1s Release
    }

    void enterStage(EnvelopeStage newStage) {
        currentStage = newStage;
        currentSampleIndex = 0;
        
        if (currentStage == ENVELOPE_STAGE_OFF || currentStage == ENVELOPE_STAGE_SUSTAIN) {
            nextStageSampleIndex = 0;
        } else {
            nextStageSampleIndex = stageValue[currentStage] * sampleRate;
        }
        
        switch (newStage) {
            case ENVELOPE_STAGE_OFF:
                currentLevel = 0.0;
                multiplier = 1.0;
                break;
                
            case ENVELOPE_STAGE_ATTACK:
                // S?A: Ch?ng click âm thanh khi gõ phím d?n d?p (Retrigger)
                currentLevel = std::max(currentLevel, minimumLevel);
                calculateMultiplier(currentLevel, 1.0, nextStageSampleIndex);
                break;
                
            case ENVELOPE_STAGE_DECAY:
                currentLevel = 1.0;
                calculateMultiplier(currentLevel, std::fmax(stageValue[ENVELOPE_STAGE_SUSTAIN], minimumLevel), nextStageSampleIndex);
                break;
                
            case ENVELOPE_STAGE_SUSTAIN:
                currentLevel = stageValue[ENVELOPE_STAGE_SUSTAIN];
                multiplier = 1.0;
                break;
                
            case ENVELOPE_STAGE_RELEASE:
                // S?A: Ð?m b?o không log s? âm ho?c b?ng 0 n?u n?t b? ng?t quá s?m
                currentLevel = std::max(currentLevel, minimumLevel);
                calculateMultiplier(currentLevel, minimumLevel, nextStageSampleIndex);
                break;
                
            default:
                break;
        }
    }

    double nextSample() {
        if (currentStage != ENVELOPE_STAGE_OFF && currentStage != ENVELOPE_STAGE_SUSTAIN) {
            
            // Ðã t?i uu: Vòng l?p while x? lý hoàn h?o tru?ng h?p v?n các núm th?i gian = 0
            while (currentSampleIndex >= nextStageSampleIndex && currentStage != ENVELOPE_STAGE_OFF && currentStage != ENVELOPE_STAGE_SUSTAIN) {
                EnvelopeStage newStage = static_cast<EnvelopeStage>((currentStage + 1) % kNumEnvelopeStages);
                enterStage(newStage);
            }
            
            if (currentStage != ENVELOPE_STAGE_OFF && currentStage != ENVELOPE_STAGE_SUSTAIN) {
                currentLevel *= multiplier;
                currentSampleIndex++;
            }
        }
        return currentLevel;
    }

    void setSampleRate(double newSampleRate) { sampleRate = newSampleRate; }
    
    void setAttack(double attackTime) { stageValue[ENVELOPE_STAGE_ATTACK] = attackTime; }
    void setDecay(double decayTime) { stageValue[ENVELOPE_STAGE_DECAY] = decayTime; }
    void setSustain(double sustainLevel) { stageValue[ENVELOPE_STAGE_SUSTAIN] = sustainLevel; }
    void setRelease(double releaseTime) { stageValue[ENVELOPE_STAGE_RELEASE] = releaseTime; }

    EnvelopeStage getCurrentStage() const { return currentStage; }

private:
    const double minimumLevel;
    EnvelopeStage currentStage;
    double currentLevel;
    double multiplier;
    double sampleRate;
    double stageValue[kNumEnvelopeStages];
    unsigned long long currentSampleIndex;
    unsigned long long nextStageSampleIndex;

    void calculateMultiplier(double startLevel, double endLevel, unsigned long long lengthInSamples) {
        if (lengthInSamples == 0) {
            multiplier = 1.0;
            return;
        }
        // S?A: S? d?ng hàm exp chính xác d? lo?i b? sai s? và ti?ng click ? th?i gian ng?n
        multiplier = std::exp((std::log(endLevel) - std::log(startLevel)) / lengthInSamples);
    }
};

#endif // ADSR_H
