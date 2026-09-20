function computeTilt(x: number, y: number, maxTilt = 12) {
  const rotateX = (0.5 - y) * maxTilt * 2;
  const rotateY = (x - 0.5) * maxTilt * 2;
  return { rotateX, rotateY };
}
console.log('Center tilt:', computeTilt(0.5, 0.5));
console.log('Top left tilt:', computeTilt(0, 0));
