// import PalantirIntegration from '@/components/palantir-integration';

export default function PalantirPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-center mb-4">
            Palantir Foundry Integration
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-center">
            Test your connection to Palantir Foundry and interact with TextClip objects
          </p>
        </div>
        
        <div className="p-8 text-center bg-gray-100 rounded-lg">
          <p className="text-gray-600">Palantir integration temporarily disabled</p>
        </div>
        {/* <PalantirIntegration /> */}
      </div>
    </div>
  );
} 