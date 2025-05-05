import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">CodeBattle</h1>
          
          <div className="flex items-center space-x-4">
            <Link
              href="/login"
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded"
            >
              Create Account
            </Link>
          </div>
        </div>
      </header>
      
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="bg-gray-50 dark:bg-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
                Challenge Your Coding Skills with Friends
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto mb-8">
                CodeBattle allows you to compete with friends on Codeforces problems in real-time. 
                Track your progress, improve your skills, and have fun!
              </p>
              <div className="flex justify-center space-x-4">
                <Link
                  href="/register"
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow-md"
                >
                  Get Started
                </Link>
                <Link
                  href="#how-it-works"
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-medium rounded-md"
                >
                  How It Works
                </Link>
              </div>
            </div>
          </div>
        </section>
        
        {/* How It Works Section */}
        <section id="how-it-works" className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
              How CodeBattle Works
            </h2>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 text-2xl font-bold mx-auto mb-4">
                  1
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                  Create a Challenge
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Set the difficulty range, number of problems, and duration for your challenge.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 text-2xl font-bold mx-auto mb-4">
                  2
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                  Invite a Friend
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Share your challenge code or link with a friend to join the battle.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 text-2xl font-bold mx-auto mb-4">
                  3
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                  Compete & Win
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Solve Codeforces problems faster than your opponent to win the battle.
                </p>
              </div>
            </div>
          </div>
        </section>
        
        {/* Features Section */}
        <section className="bg-gray-50 dark:bg-gray-900 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
              Features
            </h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                  Real-time Tracking
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Monitor your opponent's progress in real-time as they solve problems.
                </p>
              </div>
              
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                  Customizable Challenges
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Choose difficulty levels, problem count, and time limits that work for you.
                </p>
              </div>
              
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                  Codeforces Integration
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Problems are from Codeforces, so you're practicing on a real competitive platform.
                </p>
              </div>
              
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                  Challenge History
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Review your past challenges and track your improvement over time.
                </p>
              </div>
              
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                  Simple to Use
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Easy to create challenges, invite friends, and get started coding.
                </p>
              </div>
              
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                  Skill Development
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Improve your problem-solving skills with friendly competition.
                </p>
              </div>
            </div>
          </div>
        </section>
        
        {/* CTA Section */}
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Ready to Battle?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto mb-8">
              Create an account today and challenge your friends to coding battles.
            </p>
            <Link
              href="/register"
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow-md text-lg"
            >
              Start Coding Now
            </Link>
          </div>
        </section>
      </main>
      
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">CodeBattle</h2>
              <p className="text-gray-600 dark:text-gray-400">Compete. Code. Conquer.</p>
            </div>
            <div className="flex space-x-6">
              <Link href="/" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                Home
              </Link>
              <Link href="#how-it-works" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                How It Works
              </Link>
              <Link href="/login" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                Sign In
              </Link>
              <Link href="/register" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                Register
              </Link>
            </div>
          </div>
          <div className="mt-8 text-center text-gray-500 dark:text-gray-400 text-sm">
            &copy; {new Date().getFullYear()} CodeBattle. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
