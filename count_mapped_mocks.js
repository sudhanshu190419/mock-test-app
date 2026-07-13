const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ocolfottogbybitfpdqy.supabase.co';
const supabaseAnonKey = 'sb_publishable_BoCDWniQc9wIgovNGYuEUQ_Gwt7_55N';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  try {
    const { count: pkgCount, error: pkgErr } = await supabase
      .from('pyq_packages')
      .select('*', { count: 'exact', head: true });
      
    const { count: paperCount, error: paperErr } = await supabase
      .from('pyq_papers')
      .select('*', { count: 'exact', head: true });

    const { count: mappingCount, error: mappingErr } = await supabase
      .from('pyq_mock_mappings')
      .select('*', { count: 'exact', head: true });

    const { count: testCount, error: testErr } = await supabase
      .from('mock_tests')
      .select('*', { count: 'exact', head: true });

    console.log('STATS:');
    console.log(`- pyq_packages: ${pkgCount}`);
    console.log(`- pyq_papers: ${paperCount}`);
    console.log(`- pyq_mock_mappings: ${mappingCount}`);
    console.log(`- mock_tests: ${testCount}`);
    
    // Let's print details of any packages/papers that exist:
    if (pkgCount > 0) {
      const { data: pkgs } = await supabase.from('pyq_packages').select('name, package_id');
      console.log('PACKAGES LIST:', pkgs);
    }
    
    if (paperCount > 0) {
      const { data: papers } = await supabase.from('pyq_papers').select('title, paper_id, package_id');
      console.log('PAPERS LIST:', papers);
    }

    if (mappingCount > 0) {
      const { data: mappings } = await supabase.from('pyq_mock_mappings').select('paper_id, test_id');
      console.log('MAPPINGS LIST:', mappings);
    }

  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
}

run();
