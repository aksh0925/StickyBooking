$:.push File.expand_path("../lib", __FILE__)

# Maintain your gem's version:
require "sticky_booking/version"

# Describe your gem and declare its dependencies:
Gem::Specification.new do |s|
  s.name        = "sticky_booking"
  s.version     = Occsn::StickyBooking::VERSION
  s.authors     = ["Marc DeMory", "Nick Landgrebe"]
  s.email       = ["nick@landgre.be"]
  s.homepage    = "TODO"
  s.summary     = "TODO: Summary of StickyBooking."
  s.description = "TODO: Description of StickyBooking."
  s.license     = "MIT"

  s.files = Dir["{app,lib}/**/*", "MIT-LICENSE", "README.md"]

  s.add_dependency "rails", "~> 4.2.0"
end
