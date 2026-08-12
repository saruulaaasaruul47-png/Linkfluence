export const storyBackgrounds = [
  { id: 'ocean', label: 'Ocean', value: 'linear-gradient(145deg, #39a8ff 0%, #0868e4 52%, #0348ba 100%)' },
  { id: 'sunset', label: 'Sunset', value: 'linear-gradient(145deg, #ffb14d 0%, #ff5f7a 48%, #8734d4 100%)' },
  { id: 'berry', label: 'Berry', value: 'linear-gradient(145deg, #ff76bd 0%, #a83ee8 48%, #3e2fb8 100%)' },
  { id: 'mint', label: 'Mint', value: 'linear-gradient(145deg, #d7ffe5 0%, #70ddb0 50%, #168f85 100%)' },
  { id: 'midnight', label: 'Midnight', value: 'linear-gradient(145deg, #26324e 0%, #111528 48%, #05060c 100%)' },
  { id: 'sunrise', label: 'Sunrise', value: 'linear-gradient(145deg, #fff3a6 0%, #ff9d76 48%, #ff76bd 100%)' },
]

export const defaultStoryStyle = {
  background: 'ocean',
  textColor: '#ffffff',
  fontSize: 'md',
  textAlign: 'center',
  x: 50,
  y: 50,
}

export const storyBackgroundValue = (id) => storyBackgrounds.find((item) => item.id === id)?.value || storyBackgrounds[0].value

export const storyFontSize = (size) => ({ sm: 'clamp(.85rem,2.1vh,1.1rem)', md: 'clamp(1.15rem,3vh,1.65rem)', lg: 'clamp(1.55rem,4.2vh,2.35rem)' }[size] || 'clamp(1.15rem,3vh,1.65rem)')
