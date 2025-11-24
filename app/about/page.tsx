import { motion } from 'framer-motion';

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="prose prose-lg">
        <h1 className="text-4xl font-serif font-bold mb-6">About Loca</h1>

        <p className="text-lg text-gray-600 mb-8">
          Discovering great places in a new city shouldn&apos;t be a gamble.
        </p>

        <h2 className="text-2xl font-serif font-semibold mt-8 mb-4">My mission</h2>
        <p className="text-gray-700 mb-4">
          I built Loca to help you find places that match your vibe in any city around the world.
          Whether you&apos;re traveling for work, vacation, or just exploring a new neighborhood,
          I&apos;ll match you with places that share the same characteristics as your favorites back home.
        </p>

        <h2 className="text-2xl font-serif font-semibold mt-8 mb-4">How it works</h2>
        <p className="text-gray-700 mb-4">
          I use real Google Maps data combined with AI to understand what makes your favorite
          place special—whether it&apos;s the atmosphere, aesthetic, hours, or amenities—and find similar spots anywhere in the world.
        </p>

        <h2 className="text-2xl font-serif font-semibold mt-8 mb-4">Why &quot;Loca&quot;?</h2>
        <p className="text-gray-700 mb-4">
          Because every great place has a counterpart waiting to be discovered elsewhere.
          I&apos;m building a community of place explorers who believe that the perfect spot
          is never too far away.
        </p>

        <h2 className="text-2xl font-serif font-semibold mt-8 mb-4">This is an MVP</h2>
        <p className="text-gray-700 mb-4">
          Loca is currently a validation project. I&apos;m testing whether people
          actually want this tool before building the full product. Your searches are real,
          the maps are real, and the results are powered by actual Google Places data.
        </p>

        <p className="text-gray-700 mb-4">
          If you find this useful, please consider{' '}
          <a href="/" className="text-espresso hover:underline">signing up for updates</a> or{' '}
          <a href="/" className="text-espresso hover:underline">buying me a coffee</a> to
          support continued development.
        </p>

        <div className="mt-12 p-6 bg-espresso/5 rounded-2xl">
          <h3 className="text-xl font-semibold mb-2">Get in touch</h3>
          <p className="text-gray-700">
            Have feedback or suggestions? I&apos;d love to hear from you.
            Drop me a line at{' '}
            <a href="mailto:brdners@gmail.com" className="text-espresso hover:underline">
              here
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
