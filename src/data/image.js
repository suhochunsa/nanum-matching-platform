// 등록할 사진을 작게 줄여 JPG data URL로 바꾼다.
// 원본 그대로는 브라우저 저장소(약 5MB)에 몇 장 못 들어가서, 긴 변 640px·품질 0.75로 줄인다.
// (보통 한 장에 50~150KB 정도)
// TODO(7차시): Supabase Storage에 올릴 때도 이 함수로 줄인 다음 업로드하면 용량을 아낄 수 있다.

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

  return canvas.toDataURL('image/jpeg', quality)
}
