// 등록할 사진을 작게 줄여 JPG로 바꾼다.
// 긴 변 640px·품질 0.75 (보통 한 장에 50~150KB). Storage 버킷은 1MB·JPG만 받는다.

export async function compressImage(file, { maxSize = 640, quality = 0.75 } = {}) {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)

  const ctx = canvas.getContext('2d')
  // 투명 배경 PNG를 JPG로 바꿀 때 검게 나오지 않도록 흰 배경을 먼저 칠한다.
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
  if (!blob) throw new Error('사진을 변환하지 못했어요.')
  return blob
}
