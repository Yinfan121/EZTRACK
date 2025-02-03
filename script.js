const longitudeSpan = document.getElementById('longitude');
const latitudeSpan = document.getElementById('latitude');
const headingSpan = document.getElementById('heading');
const destLongitudeInput = document.getElementById('dest-longitude');
const destLatitudeInput = document.getElementById('dest-latitude');
const setDestinationButton = document.getElementById('set-destination');
const radarCanvas = document.getElementById('radar');
const radarCtx = radarCanvas.getContext('2d');
const compassLine = document.querySelector('.compass-line');
const destMarker = document.querySelector('.dest-marker');

const radarRadius = 150; // 雷达半径
const circleInterval = 30; // 每圈间隔，对应100m

let userLocation = { longitude: 0, latitude: 0 };
let destinationLocation = null;
let currentHeading = 0; // 当前朝向

let lastUpdateTime = 0;
const updateInterval = 500; // 最小更新间隔，单位：毫秒

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

// 获取 GPS 位置 (使用 watchPosition)
function getGeolocation() {
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(showPosition, showError, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
        });
    } else {
        alert("您的浏览器不支持 GPS 定位。");
    }
}

// 显示位置信息 (带节流)
function showPosition(position) {
    const now = Date.now();
    if (now - lastUpdateTime < updateInterval) {
        return;
    }
    lastUpdateTime = now;

    userLocation.longitude = position.coords.longitude;
    userLocation.latitude = position.coords.latitude;

    longitudeSpan.textContent = userLocation.longitude.toFixed(6);
    latitudeSpan.textContent = userLocation.latitude.toFixed(6);

    drawRadar();
    updateDestinationMarker(); // 更新目的地标记
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
    updateDestinationMarker(); // 更新目的地标记
});

// 请求设备方向权限 (针对 iOS 13+)
function requestDeviceOrientation() {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
            .then(permissionState => {
                if (permissionState === 'granted') {
                    window.addEventListener('deviceorientation', handleOrientation);
                } else {
                    alert('用户拒绝了设备方向权限请求。');
                }
            })
            .catch(console.error);
    } else {
        // 对于不支持 requestPermission 的设备，直接监听事件
        window.addEventListener('deviceorientation', handleOrientation);
    }
}

// 处理设备方向变化
function handleOrientation(event) {
    let heading = event.alpha; // alpha 表示设备绕 z 轴旋转的角度，即指南针方向

    // 北方修正
    if (typeof event.webkitCompassHeading !== 'undefined') {
        heading = -event.webkitCompassHeading; // 针对 WebKit 内核的修正
    } else {
        heading = 360 - heading; // 将顺时针方向转为逆时针方向
    }

    currentHeading = heading;
    headingSpan.textContent = currentHeading.toFixed(0) + '°';

    // 更新指南针
    compassLine.style.transform = `rotate(${currentHeading}deg)`;

    // 根据方向调整“北”字的位置
    const compassText = document.querySelector('.compass-text');
    if (currentHeading > 45 && currentHeading < 135) {
        compassText.textContent = '东';
        compassText.style.left = '170px';
    } else if (currentHeading >= 135 && currentHeading <= 225) {
        compassText.textContent = '南';
        compassText.style.left = '95px';
    } else if (currentHeading > 225 && currentHeading < 315) {
        compassText.textContent = '西';
        compassText.style.left = '20px';
    } else {
        compassText.textContent = '北';
        compassText.style.left = '95px';
    }

    updateDestinationMarker(); // 更新目的地标记
}

// 更新目的地标记的位置
function updateDestinationMarker() {
    if (!destinationLocation) {
        destMarker.style.display = 'none';
        return;
    }

    // 计算目的地相对于用户的方位角 (角度)
    let bearing = calculateAngle(userLocation, destinationLocation);

    // 将方位角转换为相对于当前朝向的角度
    let angleToDestination = bearing * 180 / Math.PI - currentHeading;

    // 确保角度在 -180 到 180 度之间
    if (angleToDestination > 180) angleToDestination -= 360;
    if (angleToDestination < -180) angleToDestination += 360;

    // 根据角度设置标记的位置
    const markerPosition = angleToDestination;

    // 如果角度在可见范围内，则显示标记，否则隐藏
    if (Math.abs(angleToDestination) <= 90) {
        destMarker.style.display = 'block';
        destMarker.style.left = `calc(50% + ${markerPosition}px)`;
    } else {
        destMarker.style.display = 'none';
    }
}

// 初始化
requestDeviceOrientation();
getGeolocation();
setInterval(drawRadar, 500);
