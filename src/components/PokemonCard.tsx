import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { CSSProperties, MouseEventHandler } from 'react';
import type { Pokemon } from '../types';
export function PokemonCard({ pokemon, featured = false, poster = false, onClick, ariaLabel }: { pokemon: Pokemon; featured?: boolean; poster?: boolean; onClick?: MouseEventHandler<HTMLAnchorElement>; ariaLabel?: string }) {
  return <Link className={`pokemon-card ${featured ? 'featured-card' : ''} ${poster ? 'poster-card' : ''}`} to={`/pokemon/${pokemon.id}`} style={{ '--card-color': pokemon.color, '--card-accent': pokemon.accent } as CSSProperties} aria-label={ariaLabel ?? `${pokemon.name} 성향 보기`} onClick={onClick}>
    <div className="card-top"><span>No. {String(pokemon.id).padStart(3, '0')}</span><span className="type-pill">{pokemon.type}</span></div>
    <div className="pokemon-art"><img src={`/pokemon/${pokemon.id}.png`} alt={pokemon.name} width="260" height="260" loading={featured ? 'eager' : 'lazy'} draggable="false" /></div>
    <div className="card-name"><div><h3>{pokemon.name}</h3><p>{pokemon.english}</p></div><span className="card-arrow"><ArrowUpRight size={19} /></span></div>
    <div className="card-tags">{pokemon.tags.slice(0, 2).map(tag => <span key={tag}>#{tag}</span>)}</div>
  </Link>;
}
