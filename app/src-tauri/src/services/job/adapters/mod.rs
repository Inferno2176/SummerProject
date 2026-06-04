pub mod linkedin;
pub mod indeed;
pub mod greenhouse;

pub use linkedin::LinkedInAdapter as LinkedIn;
pub use indeed::IndeedAdapter as Indeed;
pub use greenhouse::GreenhouseAdapter as Greenhouse;
