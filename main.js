// =========================================================
// CỤM 1: KHỞI TẠO WEB AUDIO API & KẾT NỐI WASM
// =========================================================

// Khai báo các biến toàn cục (để dùng ở khắp nơi)
let audioCtx;     // Trái tim của hệ thống âm thanh web
let synth;        // Biến này sẽ chứa object C++ (May_tao_song)
let isPlaying = false; // Trạng thái đang bật hay tắt tiếng
let scriptNode;   // Cầu nối liên tục xin dữ liệu từ C++ đẩy ra loa

// --- [MỚI THÊM] Biến cho Canvas ---
let analyser;     // Bộ phân tích âm thanh để vẽ sóng Main
let dataArray;    // Mảng chứa dữ liệu sóng
let bufferLength;         // <--- [SỬA 1] Thêm biến này ra làm toàn cục
let mainCtx, lfoCtx; 
let currentLfoType = 0;   // Dùng để vẽ mô phỏng LFO
let currentLfoFreq = 2.0; // Dùng để vẽ mô phỏng LFO

// Hàm này được trình duyệt gọi tự động khi file C++ (.wasm) ĐÃ TẢI XONG
Module.onRuntimeInitialized = function() {
    console.log("Thành công: Hệ thống C++ WASM đã tải xong!");
};

// Hàm khởi tạo "Sân khấu" âm thanh (Chỉ chạy 1 lần duy nhất khi bấm nút Bật)
function initAudioSystem() {
    // 1. Tạo Audio Context (Trình duyệt thường yêu cầu 44100Hz hoặc 48000Hz)
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    console.log("Sample Rate của trình duyệt là:", audioCtx.sampleRate);

    // 2. Khởi tạo bộ tổng hợp âm thanh từ class C++ (Truyền SampleRate vào)
    synth = new Module.May_tao_song(audioCtx.sampleRate);
    
    // --- [MỚI THÊM] Khởi tạo Analyser để vẽ sóng MAIN ---
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048; // Độ nét của đường vẽ (càng cao càng chi tiết)
  
    // [SỬA 2] Bỏ từ khóa 'let' đi để dùng biến toàn cục
    bufferLength = analyser.frequencyBinCount; 
    dataArray = new Uint8Array(bufferLength);
    setupCanvases(); 

    scriptNode = audioCtx.createScriptProcessor(1024, 0, 1);
    
    scriptNode.onaudioprocess = function(audioProcessingEvent) {
        let outputBuffer = audioProcessingEvent.outputBuffer;
        let channelData = outputBuffer.getChannelData(0); 
        
        for (let i = 0; i < channelData.length; i++) {
            if (isPlaying) {
                channelData[i] = synth.xu_ly(); 
            } else {
                channelData[i] = 0.0; 
            }
        }
    };
    
    scriptNode.connect(analyser);
    analyser.connect(audioCtx.destination);
    
    drawMainOsc();
    drawLFO();
}

// =========================================================
// BẮT SỰ KIỆN: NÚT BẬT / TẮT NGUỒN
// =========================================================

const btnPower = document.getElementById("btn-power");

btnPower.addEventListener("click", function() {
    // Trình duyệt bảo mật: Bắt buộc người dùng phải Click chuột thì mới cho bật Audio
    // Nếu chưa tạo audioCtx thì khởi tạo nó
    if (!audioCtx) {
        initAudioSystem();
    }
    
    // Đảo ngược trạng thái: đang tắt thành bật, đang bật thành tắt
    isPlaying = !isPlaying;
    
    if (isPlaying) {
        // Nếu bật: Cập nhật giao diện (Thêm class .active để CSS làm lún nút xuống)
        btnPower.classList.add("active");
        btnPower.innerText = "TẮT ÂM THANH";
        audioCtx.resume(); // Đánh thức Audio Context
    } else {
        // Nếu tắt: Cập nhật giao diện gỡ bỏ lún
        btnPower.classList.remove("active");
        btnPower.innerText = "BẬT ÂM THANH";
    }
});

// =========================================================
// CỤM 2: KẾT NỐI GIAO DIỆN BẢNG ĐIỀU KHIỂN VỚI LÕI C++
// =========================================================

// --- 1. ĐIỀU KHIỂN TẦN SỐ (MAIN OSC) ---
const freqSlider = document.getElementById("slider-freq"); // ID đã khớp HTML
const freqValDisplay = document.getElementById("val-freq");

if (freqSlider) {
    freqSlider.addEventListener("input", function() {
        let val = parseFloat(this.value);
        if (freqValDisplay) freqValDisplay.innerText = val; // Cập nhật số
        if (synth && isPlaying) synth.chon_tan_so(val);     // Gọi C++
    });
}

// --- 2. CHỌN LOẠI SÓNG MAIN ---
const waveBtns = document.querySelectorAll("#wave-group button");
waveBtns.forEach(btn => {
    btn.addEventListener("click", function() {
        waveBtns.forEach(b => b.classList.remove("active"));
        this.classList.add("active");
        let waveType = parseInt(this.getAttribute("data-val"));
        if (synth) synth.chon_loai_song(waveType);
    });
});

// --- 3. ĐIỀU KHIỂN LFO (TỐC ĐỘ & ĐỘ SÂU) ---
const lfoRateSlider = document.getElementById("slider-lfo-freq"); // ID đã khớp HTML
const lfoRateDisplay = document.getElementById("val-lfo-freq");

if (lfoRateSlider) {
    lfoRateSlider.addEventListener("input", function() {
        let val = parseFloat(this.value);
        if (lfoRateDisplay) lfoRateDisplay.innerText = val.toFixed(1);
        if (synth) synth.chon_lfo_tan_so(val);
        currentLfoFreq = val; // [MỚI THÊM] Lưu lại để vẽ Canvas
    });
}

const lfoDepthSlider = document.getElementById("slider-lfo-depth"); // ID đã khớp HTML
const lfoDepthDisplay = document.getElementById("val-lfo-depth");

if (lfoDepthSlider) {
    lfoDepthSlider.addEventListener("input", function() {
        let val = parseFloat(this.value);
        if (lfoDepthDisplay) lfoDepthDisplay.innerText = val.toFixed(2);
        if (synth) synth.chon_lfo_depth(val);
    });
}

// --- 4. CHỌN DẠNG SÓNG LFO ---
const lfoWaveBtns = document.querySelectorAll("#lfo-wave-group button");
lfoWaveBtns.forEach(btn => {
    btn.addEventListener("click", function() {
        lfoWaveBtns.forEach(b => b.classList.remove("active"));
        this.classList.add("active");
        let waveType = parseInt(this.getAttribute("data-val"));
        if (synth) synth.chon_lfo_loai_song(waveType);
        currentLfoType = waveType; // [MỚI THÊM] Lưu lại để vẽ Canvas
    });
});

// --- 5. CHỌN CHẾ ĐỘ MODULATION ---
const modBtns = document.querySelectorAll("#mod-group button");
modBtns.forEach(btn => {
    btn.addEventListener("click", function() {
        modBtns.forEach(b => b.classList.remove("active"));
        this.classList.add("active");
        let modMode = parseInt(this.getAttribute("data-val"));
        if (synth) synth.chon_che_do_mod(modMode);
    });
});

// --- 6. ĐIỀU KHIỂN FILTER CUTOFF ---
const cutoffSlider = document.getElementById("slider-cutoff");
const cutoffDisplay = document.getElementById("val-cutoff");

if (cutoffSlider) {
    cutoffSlider.addEventListener("input", function() {
        let val = parseFloat(this.value);
        if (cutoffDisplay) cutoffDisplay.innerText = val;
        
        // Sửa lại tên hàm cho đúng với C++
        if (synth) synth.chon_cutoff(val); 
    });
}

// --- 7. BẬT / TẮT FILTER ---
const filterPowerBtns = document.querySelectorAll("#filter-power-group button");

filterPowerBtns.forEach(btn => {
    btn.addEventListener("click", function() {
        // Xóa class active ở tất cả các nút trong nhóm
        filterPowerBtns.forEach(b => b.classList.remove("active"));
        // Thêm class active vào nút vừa được bấm
        this.classList.add("active");
        
        let val = parseInt(this.getAttribute("data-val"));
        let isFilterOn = (val === 1); // Bằng 1 là true (ON), bằng 0 là false (OFF)
        
        // --- GỌI XUỐNG C++ ---
        if (synth && synth.bat_tat_filter) {
            synth.bat_tat_filter(isFilterOn);
        }
    });
});

// =========================================================
// [MỚI THÊM] CỤM 3: VẼ BIỂU ĐỒ SÓNG (CANVAS)
// =========================================================

// Cài đặt độ phân giải cho Canvas để không bị mờ
function setupCanvases() {
    const mainCanvas = document.getElementById("main-canvas");
    const lfoCanvas = document.getElementById("lfo-canvas");
    
    mainCtx = mainCanvas.getContext("2d");
    lfoCtx = lfoCanvas.getContext("2d");

    // X2 độ phân giải để nét vẽ mịn màng trên màn hình
    mainCanvas.width = mainCanvas.clientWidth * 2;
    mainCanvas.height = mainCanvas.clientHeight * 2;
    lfoCanvas.width = lfoCanvas.clientWidth * 2;
    lfoCanvas.height = lfoCanvas.clientHeight * 2;
}

// Vẽ sóng âm thanh gốc (Main Oscillator)
function drawMainOsc() {
    requestAnimationFrame(drawMainOsc); // Lặp liên tục 60fps
    const canvas = document.getElementById("main-canvas");
    
    // Xóa nền đen mỗi khung hình
    mainCtx.fillStyle = "#050408";
    mainCtx.fillRect(0, 0, canvas.width, canvas.height);

    if (!isPlaying || !analyser) {
        // Nếu đang tắt âm: Vẽ một đường thẳng nằm ngang (im lặng)
        mainCtx.lineWidth = 4;
        mainCtx.strokeStyle = "#00ffcc"; // Màu Cyan Vaporwave
        mainCtx.beginPath();
        mainCtx.moveTo(0, canvas.height / 2);
        mainCtx.lineTo(canvas.width, canvas.height / 2);
        mainCtx.stroke();
        return;
    }

    // Lấy dữ liệu âm thanh thực tế
    analyser.getByteTimeDomainData(dataArray);

    mainCtx.lineWidth = 4;
    mainCtx.strokeStyle = "#00ffcc"; 
    mainCtx.beginPath();

    let sliceWidth = canvas.width * 1.0 / bufferLength;
    let x = 0;


    for (let i = 0; i < bufferLength; i++) {
        // [ĐÃ SỬA] Đưa dữ liệu mảng (0-255) về dải âm thanh chuẩn -1.0 đến +1.0
        let normalized = (dataArray[i] - 128.0) / 128.0; 
        
        // [ĐÃ SỬA] Lật ngược trục Y: Trừ đi normalized thay vì cộng, để dương lồi lên trên, âm lõm xuống dưới
        let y = (canvas.height / 2) - (normalized * canvas.height / 2);

        if (i === 0) {
            mainCtx.moveTo(x, y);
        } else {
            mainCtx.lineTo(x, y);
        }
        x += sliceWidth;
    }
    mainCtx.stroke();
}

// Vẽ mô phỏng sóng LFO
function drawLFO() {
    requestAnimationFrame(drawLFO);
    const canvas = document.getElementById("lfo-canvas");
    
    lfoCtx.fillStyle = "#050408";
    lfoCtx.fillRect(0, 0, canvas.width, canvas.height);

    if (!isPlaying) {
        lfoCtx.lineWidth = 4;
        lfoCtx.strokeStyle = "#ff00ff"; // Màu Pink Vaporwave
        lfoCtx.beginPath();
        lfoCtx.moveTo(0, canvas.height / 2);
        lfoCtx.lineTo(canvas.width, canvas.height / 2);
        lfoCtx.stroke();
        return;
    }

    lfoCtx.lineWidth = 4;
    lfoCtx.strokeStyle = "#ff00ff";
    lfoCtx.beginPath();

    let time = performance.now() / 1000; // Thời gian thực (giây)
    let centerY = canvas.height / 2;
    let amplitude = canvas.height / 2.5;
    
    // Vẽ từng pixel một nối lại
    for (let x = 0; x < canvas.width; x++) {
        // Tính toán để sóng trượt từ phải qua trái
        let t = time - (x / canvas.width) * (2.0 / currentLfoFreq);
        let phase = (t * currentLfoFreq) % 1.0;
        if (phase < 0) phase += 1.0;

        let val = 0;
        // Dựa vào nút đang bấm mà vẽ hình tương ứng
        switch(currentLfoType) {
            case 0: // SINE
                val = Math.sin(phase * Math.PI * 2); break;
           case 1: // SAWTOOTH
                // [SỬA 3] Đảo dấu lại để chiều vẽ hiện trên Canvas là ramp-up (tăng rồi rớt)
                val = 1.0 - 2.0 * phase; break;
            case 2: // SQUARE
                val = phase < 0.5 ? 1.0 : -1.0; break;
            case 3: // TRIANGLE
                val = 2.0 * Math.abs(2.0 * phase - 1.0) - 1.0; break;
        }

        let y = centerY - (val * amplitude);

        if (x === 0) {
            lfoCtx.moveTo(x, y);
        } else {
            lfoCtx.lineTo(x, y);
        }
    }
    lfoCtx.stroke();
}

// =========================================
// BỔ SUNG: LOGIC CHO THANH TRƯỢT ADSR
// =========================================
const adsrParams = ['attack', 'decay', 'sustain', 'release'];
adsrParams.forEach(param => {
    const slider = document.getElementById(`slider-${param}`);
    const display = document.getElementById(`val-${param}`);
    if (slider) {
        slider.addEventListener("input", (e) => {
            const val = parseFloat(e.target.value);
            display.innerText = param === 'sustain' ? val.toFixed(2) : val;
            
            if (synth) {
                // SỬA TÊN HÀM Ở ĐÂY CHO KHỚP VỚI C++
                if (param === 'attack') synth.thiet_lap_attack(val);
                else if (param === 'decay') synth.thiet_lap_decay(val);
                else if (param === 'sustain') synth.thiet_lap_sustain(val);
                else if (param === 'release') synth.thiet_lap_release(val);
            }
        });
    }
});

    // =========================================
    // BỔ SUNG: LOGIC CHO BÀN PHÍM PIANO (ĐƠN ÂM)
    // =========================================
    let currentActiveKey = null; // Biến nhớ xem phím nào đang được bấm
    const keys = document.querySelectorAll(".key");
    const sliderFreq = document.getElementById("slider-freq"); // Slider tần số cũ
    const valFreq = document.getElementById("val-freq");

    keys.forEach(key => {
        // Sự kiện khi nhấn phím (Note On)
        const triggerNoteOn = (e) => {
            if (e) e.preventDefault();
            if (!isPlaying || !synth) return; // Nếu chưa bật công tắc nguồn thì không kêu
            
            const freq = parseFloat(key.getAttribute("data-freq"));
            
            // 1. Cập nhật tần số lên thanh slider hiển thị cho đồng bộ
            if (sliderFreq) sliderFreq.value = freq;
            if (valFreq) valFreq.innerText = freq.toFixed(1);
            
            // 2. Gửi lệnh xuống C++: Set tần số và Mở ADSR
            synth.chon_tan_so(freq);
            synth.noteOn(); 
            
            // 3. Hiệu ứng đồ họa CSS lún phím
            if (currentActiveKey) currentActiveKey.classList.remove("pressed");
            key.classList.add("pressed");
            currentActiveKey = key;
        };

        // Sự kiện khi thả phím (Note Off)
        const triggerNoteOff = (e) => {
            if (e) e.preventDefault();
            if (!isPlaying || !synth) return;
            
            if (currentActiveKey === key) {
                synth.noteOff(); // Lệnh C++ xả ADSR (Release)
                key.classList.remove("pressed");
                currentActiveKey = null;
            }
        };

        // Gắn sự kiện (dùng cho chuột và cảm ứng điện thoại)
        key.addEventListener("mousedown", triggerNoteOn);
        key.addEventListener("mouseup", triggerNoteOff);
        key.addEventListener("mouseleave", triggerNoteOff); 
        key.addEventListener("touchstart", triggerNoteOn, { passive: false });
        key.addEventListener("touchend", triggerNoteOff, { passive: false });
    });