module Occsn
  module StickyBooking
    VERSION = '0.1.0'

    class Engine < ::Rails::Engine
      isolate_namespace StickyBooking
    end
  end
end
