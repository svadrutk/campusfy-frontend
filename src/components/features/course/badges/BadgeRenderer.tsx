import { Attribute } from '../utils/attributeProcessor';

type BadgeRendererProps = {
  attributes: Attribute[];
};

const getBadgeColor = (group: string) => {
  switch (group) {
    case 'credits':
      return {
        bg: 'bg-purple-100',
        text: 'text-purple-700'
      };
    case 'gen_ed':
      return {
        bg: 'bg-blue-100',
        text: 'text-blue-700'
      };
    case 'breadth':
    case 'course_breadth':
      return {
        bg: 'bg-indigo-100',
        text: 'text-indigo-700'
      };
    case 'prerequisites':
      return {
        bg: 'bg-amber-100',
        text: 'text-amber-700'
      };
    case 'quantitative':
      return {
        bg: 'bg-green-100',
        text: 'text-green-700'
      };
    case 'humanities':
      return {
        bg: 'bg-pink-100',
        text: 'text-pink-700'
      };
    case 'science':
      return {
        bg: 'bg-cyan-100',
        text: 'text-cyan-700'
      };
    case 'writing_language':
      return {
        bg: 'bg-teal-100',
        text: 'text-teal-700'
      };
    case 'extra':
      return {
        bg: 'bg-orange-100',
        text: 'text-orange-700'
      };
    case 'honors':
      return {
        bg: 'bg-rose-100',
        text: 'text-rose-700'
      };
    case 'foreign_lang':
    case 'foreignLang':
      return {
        bg: 'bg-emerald-100',
        text: 'text-emerald-700'
      };
    default:
      return {
        bg: 'bg-[var(--color-primary-light)]',
        text: 'text-[var(--color-primary)]'
      };
  }
};

const BadgeRenderer = ({ attributes }: BadgeRendererProps) => {
  if (attributes.length === 0) return null;

  return (
    <div className="flex flex-wrap justify-center gap-2 max-w-3xl mx-auto">
      {attributes.map((attribute, index) => {
        const { bg, text } = getBadgeColor(attribute.group);
        return (
          <span 
            key={`attr-${index}`} 
            className={`px-3 py-1 ${bg} ${text} rounded-full text-xs font-medium hover:scale-105 transition duration-100 hover:cursor-default`}
            title={`Group: ${attribute.group}`}
          >
            {attribute.text}
          </span>
        );
      })}
    </div>
  );
};

export default BadgeRenderer; 