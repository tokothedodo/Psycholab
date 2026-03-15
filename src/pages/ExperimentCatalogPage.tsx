import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { EXPERIMENTS_BY_CATEGORY, type ExperimentCategory } from '../data/experiments';

const CATEGORY_COLORS: Record<ExperimentCategory, string> = {
  visual: 'bg-blue-100 text-blue-800 border-blue-200',
  cognitive: 'bg-amber-100 text-amber-800 border-amber-200',
  decision: 'bg-teal-100 text-teal-800 border-teal-200',
  memory: 'bg-purple-100 text-purple-800 border-purple-200',
  social: 'bg-pink-100 text-pink-800 border-pink-200',
  perception: 'bg-green-100 text-green-800 border-green-200',
};

interface ExperimentCardProps {
  id: string;
  name: string;
  description: string;
  citation: string;
  year: number;
  duration: number;
  category: ExperimentCategory;
}

function ExperimentCard({ id, name, description, citation, year, duration, category }: ExperimentCardProps) {
  return (
    <Link
      to={`/experiments/${id}`}
      className="block p-5 bg-white border border-gray-200 rounded-lg hover:border-teal-400 hover:shadow-md transition-all group"
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-navy-900 group-hover:text-teal-700">{name}</h3>
        <span className={`text-xs px-2 py-1 rounded-full border ${CATEGORY_COLORS[category]}`}>
          {category}
        </span>
      </div>
      <p className="text-sm text-gray-600 mb-3">{description}</p>
      <div className="flex justify-between items-center text-xs text-gray-500">
        <span className="italic">{citation}, {year}</span>
        <span>{duration} min</span>
      </div>
    </Link>
  );
}

export function ExperimentCatalogPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-navy-900 text-white py-8">
        <div className="max-w-6xl mx-auto px-4">
          <h1 className="text-3xl font-bold">{t('catalog.title')}</h1>
          <p className="text-teal-400 mt-1">{t('catalog.subtitle')}</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {EXPERIMENTS_BY_CATEGORY.map((category) => (
          <section key={category.id} className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <span className={`px-3 py-1 rounded-full text-sm font-medium border ${CATEGORY_COLORS[category.id]}`}>
                {t(category.nameKey)}
              </span>
              <span className="text-gray-500 text-sm">
                {category.experiments.length} {t('catalog.experiments')}
              </span>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {category.experiments.map((exp) => (
                <ExperimentCard
                  key={exp.id}
                  id={exp.id}
                  name={t(exp.nameKey) || exp.name}
                  description={t(exp.descriptionKey) || exp.description}
                  citation={exp.citation}
                  year={exp.year}
                  duration={exp.duration}
                  category={exp.category}
                />
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
