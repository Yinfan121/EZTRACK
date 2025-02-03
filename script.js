const longitudeSpan = document.getElementById('longitude');
const latitudeSpan = document.getElementById('latitude');
const destLongitudeInput = document.getElementById('dest-longitude');
const destLatitudeInput = document.getElementById('dest-latitude');
const setDestinationButton = document.getElementById('set-destination');
const radarCanvas = document.getElementById('radar');
const radarCtx = radarCanvas.getContext('2d');

const radarRadius = 150; // 雷达半径
const circleInterval = 30; // 每圈间隔，对应100m

let userLocation = { longitude: 0, latitude: 0 };
let destinationLocation = null;

// 绘制雷达
function drawRadar() {
    radarCtx.clearRect(0, 0, radarCanvas.width, radarCanvas.height);

    // 绘制雷达圈
    for (let i = 1; i <= 5; i++) {
        radarCtx.beginPath();
        radarCtx.arc(radarRadius, radarRadius, i * circleInterval, 0, 2 * Math.PI);
        radarCtx.strokeStyle = 'green';
        radarCtx.stroke();
    }

    // 如果已设置目的地，绘制目的地
    if (destinationLocation) {
        const distance = calculateDistance(userLocation, destinationLocation);
        const angle = calculateAngle(userLocation, destinationLocation);

        let x, y;
        if (distance <= 500) {
            const scale = radarRadius / 500; // 缩放比例
            x = radarRadius + Math.sin(angle) * distance * scale;
            y = radarRadius - Math.cos(angle) * distance * scale;
        } else {
            x = radarRadius + Math.sin(angle) * radarRadius;
            y = radarRadius - Math.cos(angle) * radarRadius;
        }

        radarCtx.beginPath();
        radarCtx.arc(x, y, 5, 0, 2 * Math.PI);
        radarCtx.fillStyle = 'red';
        radarCtx.fill();
    }
}

// 计算两点之间的距离 (使用 Haversine 公式)
function calculateDistance(loc1, loc2) {
    const R = 6371e3; // 地球半径，单位：米
    const φ1 = loc1.latitude * Math.PI / 180;
    const φ2 = loc2.latitude * Math.PI / 180;
    const Δφ = (loc2.latitude - loc1.latitude) * Math.PI / 180;
    const Δλ = (loc2.longitude - loc1.longitude) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

// 计算两点之间的角度 (方位角)
function calculateAngle(loc1, loc2) {
    const φ1 = loc1.latitude * Math.PI / 180;
    const φ2 = loc2.latitude * Math.PI / 180;
    const Δλ = (loc2.longitude - loc1.longitude) * Math.PI / 180;

    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) -
        Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    const θ = Math.atan2(y, x);

    return (θ + 2 * Math.PI) % (2 * Math.PI); // 角度范围 [0, 2π)
}

// 获取 GPS 位置
function getGeolocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(showPosition, showError);
    } else {
        alert("您的浏览器不支持 GPS 定位。");
    }
}

// 显示位置信息
function showPosition(position) {
    userLocation.longitude = position.coords.longitude;
    userLocation.latitude = position.coords.latitude;

    longitudeSpan.textContent = userLocation.longitude.toFixed(6);
    latitudeSpan.textContent = userLocation.latitude.toFixed(6);

    drawRadar();
}

// 处理错误
function showError(error) {
    switch (error.code) {
        case error.PERMISSION_DENIED:
            alert("用户拒绝了地理定位请求。");
            break;
        case error.POSITION_UNAVAILABLE:
            alert("位置信息不可用。");
            break;
        case error.TIMEOUT:
            alert("请求获取用户位置超时。");
            break;
        case error.UNKNOWN_ERROR:
            alert("发生未知错误。");
            break;
    }
}

// 设置目的地
setDestinationButton.addEventListener('click', () => {
    const destLongitude = parseFloat(destLongitudeInput.value);
    const destLatitude = parseFloat(destLatitudeInput.value);

    if (isNaN(destLongitude) || isNaN(destLatitude)) {
        alert("请输入有效的目的地经纬度。");
        return;
    }

    destinationLocation = { longitude: destLongitude, latitude: destLatitude };
    drawRadar();
});

// 初始化
// getGeolocation(); // 移除此行，因为我们将在下面的 setInterval 中调用它

// 每半秒更新一次位置和雷达
setInterval(() => {
    getGeolocation(); // 获取当前位置
    // drawRadar(); // 不需要再次调用，因为 showPosition 内部已经调用了 drawRadar
}, 500);
