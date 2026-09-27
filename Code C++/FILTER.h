#pragma once
#ifndef FILTER_H
#define FILTER_H

#include <cmath>

constexpr float MIN_FREQ = 20.0f;
constexpr float MAX_FREQ = 20000.0f;

class BoLocLowPass {
private:
    float tan_so_lay_mau;
    float cutoff_freq;     
    float alpha;           
    float output_truoc_do; 

    inline void tinh_toan_alpha() {

        // alpha = 1 - e^(-2 * pi * fc / fs)
        const float PI_F = 3.141592653589793f;
        alpha = 1.0f - std::exp(-2.0f * PI_F * cutoff_freq / tan_so_lay_mau);
    }

public:
    BoLocLowPass(float sample_rate) 
        : tan_so_lay_mau(sample_rate), cutoff_freq(MAX_FREQ), output_truoc_do(0.0f) 
    {        tinh_toan_alpha();
    }

    void chon_cutoff(float freq) {
        // Khoa an toan nguong nghe con nguoi (20Hz - 20kHz)
        if (freq < MIN_FREQ) freq = MIN_FREQ;
        if (freq > MAX_FREQ) freq = MAX_FREQ;
        
        if (std::abs(cutoff_freq - freq) > 0.001f) {
            cutoff_freq = freq;
            tinh_toan_alpha();
        }
    }

    float lay_cutoff() const { return cutoff_freq; }

    inline float xu_ly(float input) {
        // Phuong trinh sai phan toi uu hoa: y[n] = y[n-1] + alpha * (x[n] - y[n-1])
        float output = output_truoc_do + alpha * (input - output_truoc_do);
        output_truoc_do = output; 
        return output;
    }
    
    void reset() {
        output_truoc_do = 0.0f;
    }
};

#endif // FILTER_H
