#include <iostream>
#include <cmath>
#include <emscripten/bind.h> 

#include "Oscillator.h" 
#include "FILTER.h" 
#include "ADSR.h" 

using namespace emscripten;

class May_tao_song {
private:
    OscillatorCore may_tao_song_chinh;
    OscillatorCore LFO;
    BoLocLowPass bo_loc; 
    EnvelopeGenerator adsr;
    
    
    float lfo_depth;
    ModMode che_do_mod;
    bool filter_on; 
    

public:
    May_tao_song(float SampleRate) 
        : may_tao_song_chinh(SampleRate), LFO(SampleRate), bo_loc(SampleRate), adsr(SampleRate)
    {
        lfo_depth = 0.5f;
        che_do_mod = MOD_OFF;
        filter_on = true; 
        LFO.chon_tan_so(2.0f); 
    }
    
    // --- API Giao tiep voi UI ---
    
    //dieu chinh tan so va loai song cua osc
    void chon_tan_so(float f) { may_tao_song_chinh.chon_tan_so(f); }
    void chon_loai_song(int loai) { may_tao_song_chinh.chon_loai_song(loai); }

    //dieu chinh tan so va loai song cua LFO
    void chon_lfo_tan_so(float f) { LFO.chon_tan_so(f); }
    void chon_lfo_loai_song(int loai) { LFO.chon_loai_song(loai); }
    
	//dieu chinh do sau dieu che va mode dieu che
    void chon_lfo_depth(float depth) { lfo_depth = depth; }
    void chon_che_do_mod(int che_do) { che_do_mod = static_cast<ModMode>(che_do); }
    
	//chon tan so cat
    void chon_cutoff(float freq) { bo_loc.chon_cutoff(freq); }
    
	 //bat hoac tat filter
    void bat_tat_filter(bool trang_thai) { filter_on = trang_thai; }
    
	//dieu chinh tham so ADSR
    void thiet_lap_attack(float a) { adsr.setAttack(a); }
    void thiet_lap_decay(float d) { adsr.setDecay(d); }
    void thiet_lap_sustain(float s) { adsr.setSustain(s); }
    void thiet_lap_release(float r) { adsr.setRelease(r); }
    
    //nhan va nha phim nhac de kich hoat ADSR
    void noteOn() { adsr.enterStage(EnvelopeGenerator::ENVELOPE_STAGE_ATTACK); }
    void noteOff() { adsr.enterStage(EnvelopeGenerator::ENVELOPE_STAGE_RELEASE); }
    
  

    // --- Luong xu ly am thanh ---
    float xu_ly() {
        // 1. Chay LFO, lfo_val chua gia tri cac sample cua LFO
        float lfo_val = LFO.xu_ly();
        
        // 2. Xu lý Oscillator Chính & FM Modulation
        float current_freq = -1.0f; // bien tan so = -1 de ep FM khong hoat dong
        if (che_do_mod == MOD_FM) {
            float freq_goc = may_tao_song_chinh.lay_tan_so();
            current_freq = freq_goc * std::pow(2.0f, lfo_val * lfo_depth);
        }
        //ben osc.h neu current_freq hay custom_freq < 0 thi se lay buoc_nhay_pha là buoc nhay cua tan so song osc ban dau de tinh toan.
        float output = may_tao_song_chinh.xu_ly(current_freq);

        // 3. Xu lý AM Modulation
        if (che_do_mod == MOD_AM) {
            float unipolar_lfo = (lfo_val + 1.0f) / 2.0f; 
            float am_mod = 1.0f - lfo_depth + (unipolar_lfo * lfo_depth);
            output *= am_mod;
        }
       
       //ADSR
       float env_val = adsr.nextSample();
        output *= env_val;

        // 4. Xu lý Filter (TRUE BYPASS)
        if (filter_on) {
            return bo_loc.xu_ly(output);
        } else {
            return output; // Bo qua màng loc
        }
    }
};

// ==========================================================
// --- BINDING CHO JAVASCRIPT ---
// ==========================================================
EMSCRIPTEN_BINDINGS(may_tao_song_module) {
    class_<May_tao_song>("May_tao_song")
        .constructor<float>()
        .function("chon_tan_so", &May_tao_song::chon_tan_so)
        .function("chon_loai_song", &May_tao_song::chon_loai_song)
        .function("chon_lfo_tan_so", &May_tao_song::chon_lfo_tan_so)
        .function("chon_lfo_loai_song", &May_tao_song::chon_lfo_loai_song)
        .function("chon_lfo_depth", &May_tao_song::chon_lfo_depth)
        .function("chon_che_do_mod", &May_tao_song::chon_che_do_mod)
        .function("chon_cutoff", &May_tao_song::chon_cutoff)
        .function("bat_tat_filter", &May_tao_song::bat_tat_filter)
        .function("xu_ly", &May_tao_song::xu_ly)
        
        .function("thiet_lap_attack", &May_tao_song::thiet_lap_attack)
        .function("thiet_lap_decay", &May_tao_song::thiet_lap_decay)
        .function("thiet_lap_sustain", &May_tao_song::thiet_lap_sustain)
        .function("thiet_lap_release", &May_tao_song::thiet_lap_release)
        .function("noteOn", &May_tao_song::noteOn)
        .function("noteOff", &May_tao_song::noteOff);
}
