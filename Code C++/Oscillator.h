




#pragma once
#ifndef OSCILLATOR_H
#define OSCILLATOR_H

#include <cmath>

constexpr float PI_F = 3.141592653589793f;
constexpr float TWO_PI_F = 2.0f * PI_F;

enum Waveform { SINE = 0, SAWTOOTH = 1, SQUARE = 2, TRIANGLE = 3 };


enum ModMode { MOD_OFF = 0, MOD_AM = 1, MOD_FM = 2 };

class OscillatorCore {
private:
    float tan_so_lay_mau;
    float tan_so;
    float pha;
    float buoc_nhay_pha;
    Waveform loai_song;
    
    inline void tinh_toan_buoc_nhay_pha() {
        buoc_nhay_pha = tan_so / tan_so_lay_mau;
    }

public:
    OscillatorCore(float SampleRate) 
        : tan_so_lay_mau(SampleRate), tan_so(440.0f), pha(0.0f), loai_song(SINE) 
    {
        tinh_toan_buoc_nhay_pha();
    }
    
    void chon_tan_so(float f) {
        if (f > 0.0f) {
            tan_so = f;
            tinh_toan_buoc_nhay_pha();
        }
    }
    
    void chon_loai_song(int loai) {
        loai_song = static_cast<Waveform>(loai);
    }

    float lay_tan_so() const { return tan_so; }
    //bien custom_freq goi ra de thay doi tan so FM, neu tan so FM duoc nhap vao, tinh toan lai buoc nhay cho vao current_buoc_nhay khong thi cu lay buoc nhay o buoc_nhay_pha
    float xu_ly(float custom_freq = -1.0f) {
        float output = 0.0f;
        float current_buoc_nhay = (custom_freq > 0.0f) ? (custom_freq / tan_so_lay_mau) : buoc_nhay_pha;
        
        switch (loai_song) {
            case SINE:     output = std::sin(pha * TWO_PI_F); break;
            case SQUARE:   output = (pha < 0.5f) ? 1.0f : -1.0f; break;
            case SAWTOOTH: output = (2.0f * pha) - 1.0f; break;
            case TRIANGLE: output = (pha < 0.5f) ? ((4.0f * pha) - 1.0f) : (3.0f - (4.0f * pha)); break;
        }
        
        pha += current_buoc_nhay; 
        if (pha >= 1.0f) pha -= 1.0f;
        
        return output;
    }
};

#endif
