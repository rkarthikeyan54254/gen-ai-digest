def greet(name):
    return f"Hello, {name}!"

def calculate_sum(numbers):
    return sum(numbers)

if __name__ == "__main__":
    # Basic greeting
    print(greet("World"))
    
    # Demonstrate some basic Python features
    numbers = [1, 2, 3, 4, 5]
    print(f"Sum of numbers {numbers}: {calculate_sum(numbers)}")
    
    # List comprehension example
    squares = [x**2 for x in range(5)]
    print(f"First 5 square numbers: {squares}")
    
    # Dictionary example
    person = {
        "name": "Alice",
        "age": 30,
        "city": "Python Land"
    }
    print(f"Person details: {person}")