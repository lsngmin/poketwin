export type TrainerAvatar = 'red' | 'green';

// 포켓몬스터 레츠고! 피카츄·이브이 공식 일러스트 (Bulbagarden Archives)
export const trainerAvatars: { id: TrainerAvatar; label: string; src: string }[] = [
  { id: 'red', label: '레드', src: '/trainers/red.webp' },
  { id: 'green', label: '그린', src: '/trainers/green.webp' },
];

export const getAvatar = (id: string) => trainerAvatars.find(avatar => avatar.id === id) ?? trainerAvatars[0];
