const createbongtuyet = () => {
    const bongtuyet = document.createElement('div'); // Tạo một phần tử <div>
    bongtuyet.classList.add('bongtuyet'); // Thêm class 'bongtuyet'
    bongtuyet.textContent = '❄'; // Biểu tượng bông tuyết
    bongtuyet.style.left = Math.random() * window.innerWidth + 'px'; // Vị trí ngẫu nhiên trên màn hình
    bongtuyet.style.animationDuration = Math.random() * 3 + 2 + 's'; // Thời gian rơi ngẫu nhiên
    bongtuyet.style.opacity = Math.random() + 0.2; // Độ trong suốt ngẫu nhiên (không quá mờ)
    bongtuyet.style.fontSize = Math.random() * 20 + 10 + 'px'; // Kích thước ngẫu nhiên
    document.body.appendChild(bongtuyet); // Thêm bông tuyết vào trang

    setTimeout(() => {
        bongtuyet.remove(); // Xóa bông tuyết sau khi rơi xong
    }, 5000); // Thời gian sống của bông tuyết
};

// Tạo bông tuyết liên tục
setInterval(createbongtuyet, 200); // Mỗi 200ms thêm một bông tuyết mới
