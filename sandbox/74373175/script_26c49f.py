
# Ensure matplotlib is available and set it to use the Agg backend for no interactive display
import matplotlib.pyplot as plt
matplotlib.use('Agg')

# Calculate the area and circumference of the circle
radius = 3.75
area = 3.14159 * radius**2
circumference = 2 * 3.14159 * radius

# Print the results
print(f"Radius: {radius}m")
print(f"Area: {area:.2f}m²")
print(f"Circumference: {circumference:.2f}m")

# Create a circle plot
fig, ax = plt.subplots()
circle = plt.Circle((0, 0), radius, color='b', fill=False)
ax.add_artist(circle)
ax.set_aspect('equal', adjustable='box')
ax.set_title('Circle Plot')

# Save the plot to a file
plt.savefig('circle.png', dpi=150, bbox_inches='tight')
plt.close()
